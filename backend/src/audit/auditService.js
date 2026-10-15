import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Keys that must never reach the audit trail, at any nesting level.
 * (Defence in depth: callers should not pass these in the first place.)
 */
const SENSITIVE_KEY = /pass|token|secret|authorization|cookie|apikey|api_key|privatekey|credential|hash/i;

function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value !== 'object') return value;
  if (depth >= 3) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : sanitize(v, depth + 1);
  }
  return out;
}

function requestFields(req) {
  return {
    requestId: req?.id ?? null,
    ip: req?.ip ?? null,
    userAgent: req?.headers?.['user-agent']?.slice(0, 300) ?? null,
  };
}

/**
 * Persist an audit record. Never throws: an audit-store failure must not turn a
 * successful request into an error, but it IS logged loudly.
 * Future: forward to the CloudWatch sink here (Stage 4).
 */
export async function recordAudit({ req, userId, category, action, outcome = 'SUCCESS', metadata }) {
  const entry = {
    category, action, outcome,
    userId: userId ?? req?.user?.id ?? null,
    metadata: sanitize(metadata ?? {}),
    ...requestFields(req),
  };
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    logger.error('audit_write_failed', { action, error: err.message });
  }
  logger.info('audit', entry);
}

/** Record a SecurityEvent produced by an implemented detection rule. */
export async function recordSecurityEvent({ req, userId, ruleId, type, severity, description, metadata }) {
  const entry = {
    ruleId, type, severity, description,
    userId: userId ?? null,
    metadata: sanitize(metadata ?? {}),
    requestId: req?.id ?? null,
    ip: req?.ip ?? null,
  };
  try {
    await prisma.securityEvent.create({ data: entry });
  } catch (err) {
    logger.error('security_event_write_failed', { ruleId, error: err.message });
  }
  logger.warn('security_event', entry);
}
