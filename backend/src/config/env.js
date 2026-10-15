import 'dotenv/config';
import { z } from 'zod';

const placeholder = (v) => /^CHANGE_ME/i.test(v);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters')
    .refine((v) => !placeholder(v), 'is still the placeholder value; generate a real secret'),
  JWT_ISSUER: z.string().default('securevault'),
  JWT_AUDIENCE: z.string().default('securevault-web'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  ABSOLUTE_SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(300),
  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).default(15),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  // Never print values: they may be secrets.
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}
const e = parsed.data;

export const config = Object.freeze({
  env: e.NODE_ENV,
  isProd: e.NODE_ENV === 'production',
  port: e.PORT,
  logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : 'info'),
  trustProxy: e.TRUST_PROXY,
  corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  jwt: {
    secret: e.JWT_ACCESS_SECRET,
    issuer: e.JWT_ISSUER,
    audience: e.JWT_AUDIENCE,
    accessTtlSeconds: e.ACCESS_TOKEN_TTL_SECONDS,
  },
  session: {
    refreshTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
    absoluteDays: e.ABSOLUTE_SESSION_DAYS,
    cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === 'true' : e.NODE_ENV === 'production',
  },
  rateLimit: {
    authMax: e.RATE_LIMIT_AUTH_MAX,
    authWindowMs: e.RATE_LIMIT_AUTH_WINDOW_MS,
    globalMax: e.RATE_LIMIT_GLOBAL_MAX,
  },
  lockout: { maxFailed: e.MAX_FAILED_LOGINS, minutes: e.LOCKOUT_MINUTES },
});
