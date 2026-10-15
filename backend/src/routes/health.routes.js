import { Router } from 'express';
import { prisma } from '../config/prisma.js';

const r = Router();

// Liveness: process is up.
r.get('/', (_req, res) => res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) }));

// Readiness: dependencies that are actually checked. Storage/KMS/CloudWatch checks arrive in later stages.
r.get('/ready', async (_req, res) => {
  const checks = { database: 'down' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'up';
  } catch { /* reported below */ }
  const ready = Object.values(checks).every((v) => v === 'up');
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', checks });
});

export default r;
