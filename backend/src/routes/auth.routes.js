import { Router } from 'express';
import * as ctrl from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireCsrf } from '../middleware/csrf.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/authSchemas.js';

export function createAuthRouter({ authLimiter }) {
  const r = Router();
  r.post('/register', authLimiter, validate(registerSchema), ctrl.register);
  r.post('/login', authLimiter, validate(loginSchema), ctrl.login);
  r.post('/refresh', authLimiter, requireCsrf, ctrl.refresh);
  r.post('/logout', requireCsrf, ctrl.logout);
  r.post('/change-password', authLimiter, authenticate, validate(changePasswordSchema), ctrl.changePassword);
  r.get('/me', authenticate, ctrl.me);
  return r;
}
