import { z } from 'zod';
import { PASSWORD_MAX, passwordPolicyIssues } from './password.js';

const email = z.string().trim().toLowerCase().email().max(254);

const newPassword = z.string().max(PASSWORD_MAX).superRefine((pw, ctx) => {
  for (const message of passwordPolicyIssues(pw)) ctx.addIssue({ code: 'custom', message });
});

// .strict() rejects unknown keys, so clients cannot smuggle in `role` or `status`.
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100)
    // eslint-disable-next-line no-control-regex
    .refine((s) => !/[\u0000-\u001f\u007f]/.test(s), 'Contains invalid characters'),
  email,
  password: newPassword,
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(PASSWORD_MAX),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword,
}).strict();
