import { config } from '../config/env.js';

export const REFRESH_COOKIE = 'sv_refresh';
export const CSRF_COOKIE = 'sv_csrf';
const REFRESH_PATH = '/api/v1/auth';

const base = () => ({
  secure: config.session.cookieSecure,
  sameSite: 'strict',
});

export function setSessionCookies(res, { refreshToken, csrfToken }) {
  const maxAge = config.session.refreshTtlDays * 24 * 60 * 60 * 1000;
  // Refresh token: unreadable by JavaScript, only sent to the auth routes.
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base(), httpOnly: true, path: REFRESH_PATH, maxAge });
  // CSRF token: readable by the SPA so it can echo it in a header (double-submit).
  res.cookie(CSRF_COOKIE, csrfToken, { ...base(), httpOnly: false, path: '/', maxAge });
}

export function clearSessionCookies(res) {
  res.clearCookie(REFRESH_COOKIE, { ...base(), httpOnly: true, path: REFRESH_PATH });
  res.clearCookie(CSRF_COOKIE, { ...base(), httpOnly: false, path: '/' });
}
