import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const app = createApp();
const PW = 'Str0ng!Passphrase#1';
const user = { name: 'Alice', email: 'alice@example.com', password: PW };
const API = '/api/v1';

const cookiesOf = (res) => Object.fromEntries(
  (res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).map((p) => {
    const i = p.indexOf('=');
    return [p.slice(0, i), p.slice(i + 1)];
  }));

const register = (u = user) => request(app).post(`${API}/auth/register`).send(u);
const login = (email = user.email, password = PW) =>
  request(app).post(`${API}/auth/login`).send({ email, password });
const refreshWith = (c, csrf = c.sv_csrf) => request(app).post(`${API}/auth/refresh`)
  .set('Cookie', `sv_refresh=${c.sv_refresh}; sv_csrf=${c.sv_csrf}`)
  .set('X-CSRF-Token', csrf ?? '');

beforeEach(async () => {
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(() => prisma.$disconnect());

describe('registration', () => {
  it('creates a USER and never returns the password hash', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: user.email, role: 'USER', status: 'ACTIVE' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    const row = await prisma.user.findUnique({ where: { email: user.email } });
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
  });
  it('normalizes email case', async () => {
    await register({ ...user, email: 'ALICE@Example.COM' });
    expect(await prisma.user.count({ where: { email: 'alice@example.com' } })).toBe(1);
  });
  it('rejects weak passwords', async () => {
    expect((await register({ ...user, password: 'short' })).status).toBe(400);
  });
  it('rejects attempts to set a role (mass assignment)', async () => {
    const res = await register({ ...user, role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });
  it('returns a generic 409 for a duplicate email', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REGISTRATION_FAILED');
  });
});

describe('login', () => {
  beforeEach(async () => { await register(); });

  it('succeeds, sets cookies, and keeps the refresh token out of the JSON body', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain(cookiesOf(res).sv_refresh);
    const raw = res.headers['set-cookie'].find((c) => c.startsWith('sv_refresh='));
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);
  });
  it('stores only a hash of the refresh token', async () => {
    const res = await login();
    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(cookiesOf(res).sv_refresh);
  });
  it('gives identical errors for wrong password and unknown user', async () => {
    const a = await login(user.email, 'Wrong!Password123');
    const b = await login('nobody@example.com', PW);
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.code).toBe(b.body.error.code);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
  it('locks the account after repeated failures, even for the right password', async () => {
    for (let i = 0; i < 5; i++) await login(user.email, 'Wrong!Password123');
    expect((await login()).status).toBe(401);
    const ev = await prisma.securityEvent.findFirst({ where: { ruleId: 'AUTH-BRUTE-FORCE-001' } });
    expect(ev).not.toBeNull();
  });
  it('writes audit records for success and failure without secrets', async () => {
    await login();
    await login(user.email, 'Wrong!Password123');
    const logs = await prisma.auditLog.findMany({ where: { action: 'auth.login' } });
    expect(logs.map((l) => l.outcome).sort()).toEqual(['FAILURE', 'SUCCESS']);
    expect(logs.every((l) => l.requestId)).toBe(true);
    expect(JSON.stringify(logs)).not.toContain('Wrong!Password123');
    expect(JSON.stringify(logs)).not.toContain(PW);
  });
});

describe('authentication enforcement', () => {
  it('rejects requests without a token', async () => {
    expect((await request(app).get(`${API}/auth/me`)).status).toBe(401);
  });
  it('rejects a tampered token', async () => {
    await register();
    const { accessToken } = (await login()).body;
    const bad = `${accessToken.slice(0, -4)}AAAA`;
    expect((await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${bad}`)).status).toBe(401);
  });
  it('accepts a valid token', async () => {
    await register();
    const { accessToken } = (await login()).body;
    const res = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });
  it('stops honouring tokens as soon as the account is suspended', async () => {
    await register();
    const { accessToken } = (await login()).body;
    await prisma.user.update({ where: { email: user.email }, data: { status: 'SUSPENDED' } });
    expect((await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(401);
  });
});

describe('refresh rotation and CSRF', () => {
  beforeEach(async () => { await register(); });

  it('rejects refresh without a matching CSRF header', async () => {
    const c = cookiesOf(await login());
    expect((await refreshWith(c, 'wrong')).status).toBe(403);
  });
  it('rotates the refresh token', async () => {
    const c = cookiesOf(await login());
    const res = await refreshWith(c);
    expect(res.status).toBe(200);
    expect(cookiesOf(res).sv_refresh).not.toBe(c.sv_refresh);
  });
  it('detects reuse of a rotated token and revokes the whole family', async () => {
    const c1 = cookiesOf(await login());
    const c2 = cookiesOf(await refreshWith(c1));
    expect((await refreshWith(c1)).status).toBe(401);   // replay of the old token
    expect((await refreshWith(c2)).status).toBe(401);   // legitimate successor is now revoked too
    const ev = await prisma.securityEvent.findFirst({ where: { ruleId: 'AUTH-REFRESH-REUSE-001' } });
    expect(ev?.severity).toBe('HIGH');
  });
  it('logout revokes the session', async () => {
    const c = cookiesOf(await login());
    const out = await request(app).post(`${API}/auth/logout`)
      .set('Cookie', `sv_refresh=${c.sv_refresh}; sv_csrf=${c.sv_csrf}`).set('X-CSRF-Token', c.sv_csrf);
    expect(out.status).toBe(204);
    expect((await refreshWith(c)).status).toBe(401);
  });
});

describe('change password', () => {
  const NEW = 'An0ther!Strong#Pass';
  beforeEach(async () => { await register(); });

  it('rejects a wrong current password', async () => {
    const { accessToken } = (await login()).body;
    const res = await request(app).post(`${API}/auth/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Nope!Nope!Nope1', newPassword: NEW });
    expect(res.status).toBe(400);
  });
  it('changes the password and revokes existing sessions', async () => {
    const first = await login();
    const c = cookiesOf(first);
    const res = await request(app).post(`${API}/auth/change-password`)
      .set('Authorization', `Bearer ${first.body.accessToken}`)
      .send({ currentPassword: PW, newPassword: NEW });
    expect(res.status).toBe(200);
    expect((await refreshWith(c)).status).toBe(401);
    expect((await login(user.email, PW)).status).toBe(401);
    expect((await login(user.email, NEW)).status).toBe(200);
  });
});

describe('rate limiting', () => {
  it('returns 429 once the auth limit is exceeded', async () => {
    const tight = createApp({ authRateLimitMax: 3 });
    const attempt = () => request(tight).post(`${API}/auth/login`)
      .send({ email: 'x@example.com', password: 'Whatever!123' });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });
});

describe('health and error handling', () => {
  it('liveness and readiness (real DB check)', async () => {
    expect((await request(app).get(`${API}/health`)).status).toBe(200);
    const ready = await request(app).get(`${API}/health/ready`);
    expect(ready.status).toBe(200);
    expect(ready.body.checks.database).toBe('up');
  });
  it('returns JSON 404 and sends security headers', async () => {
    const res = await request(app).get(`${API}/nope`);
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
  it('returns 400 for malformed JSON without leaking internals', async () => {
    const res = await request(app).post(`${API}/auth/login`)
      .set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|stack/);
  });
});
