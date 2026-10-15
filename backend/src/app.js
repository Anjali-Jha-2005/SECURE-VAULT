import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';

function limiter({ windowMs, max, name }) {
  return rateLimit({
    windowMs, limit: max, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (req, res) => {
      // Logged, not written to the DB: persisting every blocked request would let an
      // attacker fill the audit table.
      logger.warn('rate_limit_exceeded', { limiter: name, requestId: req.id, ip: req.ip });
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later',
        requestId: req.id } });
    },
  });
}

/** `overrides` exists so tests can build an app with tight limits. */
export function createApp(overrides = {}) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      // No Origin header = same-origin or non-browser client.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  }));
  app.use(limiter({ windowMs: 60_000, max: config.rateLimit.globalMax, name: 'global' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const authLimiter = limiter({
    windowMs: config.rateLimit.authWindowMs,
    max: overrides.authRateLimitMax ?? config.rateLimit.authMax,
    name: 'auth',
  });

  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', createAuthRouter({ authLimiter }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
