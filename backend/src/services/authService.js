import crypto from 'node:crypto';
import argon2 from 'argon2';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { recordAudit, recordSecurityEvent } from '../audit/auditService.js';
import { signAccessToken, generateOpaqueToken, hashToken } from './tokenService.js';

// OWASP-recommended Argon2id baseline (19 MiB, 2 iterations, 1 lane).
const ARGON = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const DAY = 24 * 60 * 60 * 1000;

export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.createdAt,
});

export const hashPassword = (pw) => argon2.hash(pw, ARGON);

// Verified when the email is unknown so response time does not reveal account existence.
let dummyHash;
const getDummyHash = () => (dummyHash ??= argon2.hash(crypto.randomBytes(16).toString('hex'), ARGON));

async function verifyPassword(hash, pw) {
  try { return await argon2.verify(hash, pw); } catch { return false; }
}

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
const sessionExpired = () => new AppError(401, 'SESSION_INVALID', 'Session is invalid or has expired');

// ---------------------------------------------------------------- registration
export async function register({ name, email, password }, req) {
  const passwordHash = await hashPassword(password);
  try {
    // `role` and `status` are intentionally not inputs: schema defaults (USER / ACTIVE) apply.
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await recordAudit({ req, userId: user.id, category: 'AUTH', action: 'auth.register' });
    return publicUser(user);
  } catch (err) {
    if (err.code === 'P2002') {
      await recordAudit({ req, category: 'AUTH', action: 'auth.register', outcome: 'FAILURE',
        metadata: { reason: 'email_in_use' } });
      // Generic message: does not confirm that the address is registered.
      throw new AppError(409, 'REGISTRATION_FAILED', 'Registration could not be completed with these details');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------- tokens
async function createRefreshToken(tx, { userId, familyId, absoluteExpiresAt, req }) {
  const raw = generateOpaqueToken();
  const expiresAt = new Date(Math.min(
    Date.now() + config.session.refreshTtlDays * DAY, absoluteExpiresAt.getTime()));
  const row = await tx.refreshToken.create({
    data: {
      userId, familyId, absoluteExpiresAt, expiresAt,
      tokenHash: hashToken(raw),
      userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
      ip: req.ip ?? null,
    },
  });
  return { raw, row };
}

function sessionBundle(user, refreshToken) {
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    expiresIn: config.jwt.accessTtlSeconds,
    refreshToken,
    csrfToken: generateOpaqueToken(),
  };
}

// ----------------------------------------------------------------------- login
export async function login({ email, password }, req) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());
  const suspended = Boolean(user && user.status !== 'ACTIVE');

  if (!user || !ok || locked || suspended) {
    const reason = !user ? 'unknown_user' : locked ? 'account_locked'
      : suspended ? 'account_suspended' : 'bad_password';
    await recordAudit({ req, userId: user?.id, category: 'AUTH', action: 'auth.login',
      outcome: 'FAILURE', metadata: { reason } });
    if (user && !ok && !locked && !suspended) await registerFailedAttempt(user, req);
    // Identical response for every failure mode (prevents account enumeration).
    throw invalidCredentials();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const { raw } = await prisma.$transaction((tx) => createRefreshToken(tx, {
    userId: user.id,
    familyId: crypto.randomUUID(),
    absoluteExpiresAt: new Date(Date.now() + config.session.absoluteDays * DAY),
    req,
  }));
  await recordAudit({ req, userId: user.id, category: 'AUTH', action: 'auth.login' });
  return sessionBundle(user, raw);
}

/** Detection rule AUTH-BRUTE-FORCE-001: N consecutive failures lock the account. */
async function registerFailedAttempt(user, req) {
  const { failedLoginCount } = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (failedLoginCount >= config.lockout.maxFailed) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + config.lockout.minutes * 60_000) },
    });
    await recordSecurityEvent({
      req, userId: user.id, ruleId: 'AUTH-BRUTE-FORCE-001', type: 'ACCOUNT_LOCKED', severity: 'MEDIUM',
      description: `Account locked after ${config.lockout.maxFailed} consecutive failed logins`,
      metadata: { lockoutMinutes: config.lockout.minutes },
    });
  }
}

// --------------------------------------------------------------------- refresh
async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null }, data: { revokedAt: new Date() },
  });
}

async function handleReuse(existing, req) {
  await revokeFamily(existing.familyId);
  await recordSecurityEvent({
    req, userId: existing.userId, ruleId: 'AUTH-REFRESH-REUSE-001', type: 'REFRESH_TOKEN_REUSE',
    severity: 'HIGH',
    description: 'A revoked refresh token was presented again; the whole session family was revoked',
    metadata: { familyId: existing.familyId },
  });
  await recordAudit({ req, userId: existing.userId, category: 'AUTH', action: 'auth.refresh',
    outcome: 'DENIED', metadata: { reason: 'token_reuse' } });
}

export async function refresh(rawToken, req) {
  if (!rawToken) throw sessionExpired();
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) }, include: { user: true },
  });
  if (!existing) throw sessionExpired();

  if (existing.revokedAt) {
    await handleReuse(existing, req);
    throw sessionExpired();
  }
  const now = new Date();
  if (existing.expiresAt <= now || existing.absoluteExpiresAt <= now || existing.user.status !== 'ACTIVE') {
    await recordAudit({ req, userId: existing.userId, category: 'AUTH', action: 'auth.refresh',
      outcome: 'FAILURE', metadata: { reason: 'expired_or_inactive' } });
    throw sessionExpired();
  }

  // Rotation. The conditional update makes the claim atomic, so two concurrent
  // requests with the same token cannot both succeed.
  const next = await prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null }, data: { revokedAt: now },
    });
    if (claimed.count !== 1) return null;
    const created = await createRefreshToken(tx, {
      userId: existing.userId, familyId: existing.familyId,
      absoluteExpiresAt: existing.absoluteExpiresAt, req,
    });
    await tx.refreshToken.update({ where: { id: existing.id }, data: { replacedById: created.row.id } });
    return created;
  });
  if (!next) {
    await handleReuse(existing, req);
    throw sessionExpired();
  }
  await recordAudit({ req, userId: existing.userId, category: 'AUTH', action: 'auth.refresh' });
  return sessionBundle(existing.user, next.raw);
}

// ---------------------------------------------------------------------- logout
export async function logout(rawToken, req) {
  if (!rawToken) return;
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!existing) return;
  await revokeFamily(existing.familyId);
  await recordAudit({ req, userId: existing.userId, category: 'AUTH', action: 'auth.logout' });
}

// ------------------------------------------------------------- change password
export async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    await recordAudit({ req, userId, category: 'AUTH', action: 'auth.change_password',
      outcome: 'FAILURE', metadata: { reason: 'bad_current_password' } });
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'New password must differ from the current password');
  }
  const passwordHash = await hashPassword(newPassword);
  // Password change and session revocation succeed or fail together.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await recordAudit({ req, userId, category: 'AUTH', action: 'auth.change_password' });
}
