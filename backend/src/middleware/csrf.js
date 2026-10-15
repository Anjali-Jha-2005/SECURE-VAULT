import { AppError } from '../utils/errors.js';
import { CSRF_COOKIE } from '../utils/cookies.js';
import { safeEqual } from '../services/tokenService.js';

/**
 * Double-submit CSRF check for endpoints that authenticate via cookie (refresh, logout).
 * Other endpoints use a Bearer header, which browsers never attach automatically.
 * SameSite=Strict on the cookies is the primary defence; this is the second layer.
 */
export function requireCsrf(req, _res, next) {
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.headers['x-csrf-token'];
  if (!cookie || typeof header !== 'string' || !safeEqual(cookie, header)) {
    return next(new AppError(403, 'CSRF_FAILED', 'CSRF validation failed'));
  }
  next();
}
