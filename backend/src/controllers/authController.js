import { asyncHandler } from '../utils/errors.js';
import * as auth from '../services/authService.js';
import { REFRESH_COOKIE, setSessionCookies, clearSessionCookies } from '../utils/cookies.js';

function sendSession(res, status, bundle) {
  setSessionCookies(res, { refreshToken: bundle.refreshToken, csrfToken: bundle.csrfToken });
  // The refresh token itself is only ever delivered as an HttpOnly cookie, never in JSON.
  res.status(status).json({
    user: bundle.user,
    accessToken: bundle.accessToken,
    expiresIn: bundle.expiresIn,
    csrfToken: bundle.csrfToken,
  });
}

export const register = asyncHandler(async (req, res) => {
  const user = await auth.register(req.body, req);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  sendSession(res, 200, await auth.login(req.body, req));
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    sendSession(res, 200, await auth.refresh(req.cookies?.[REFRESH_COOKIE], req));
  } catch (err) {
    clearSessionCookies(res);
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(req.cookies?.[REFRESH_COOKIE], req);
  clearSessionCookies(res);
  res.status(204).end();
});

export const changePassword = asyncHandler(async (req, res) => {
  await auth.changePassword(req.user.id, req.body, req);
  clearSessionCookies(res); // all sessions were revoked; the user must sign in again
  res.status(200).json({ message: 'Password changed. Please sign in again.' });
});

export const me = (req, res) => res.json({ user: req.user });
