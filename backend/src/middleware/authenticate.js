import { prisma } from '../config/prisma.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { recordAudit } from '../audit/auditService.js';
import { verifyAccessToken } from '../services/tokenService.js';

const unauth = () => new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

/** Requires a valid Bearer access token AND an ACTIVE account (re-checked in the DB every request,
 *  so suspending a user takes effect immediately rather than at token expiry). */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauth();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    await recordAudit({ req, category: 'AUTH', action: 'auth.token_invalid', outcome: 'FAILURE' });
    throw unauth();
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  if (!user || user.status !== 'ACTIVE') throw unauth();
  req.user = user;
  next();
});

/** Role-based access control. Role comes from the database record, never from the token. */
export const requireRole = (...roles) => asyncHandler(async (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    await recordAudit({ req, category: 'AUTHZ', action: 'authz.role_denied', outcome: 'DENIED',
      metadata: { required: roles, path: req.originalUrl.split('?')[0] } });
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
  }
  next();
});
