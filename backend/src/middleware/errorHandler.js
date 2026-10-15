import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err?.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON';
  } else if (err?.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large';
  } else {
    // Unknown errors are logged with the request id but never leaked to the client.
    logger.error('unhandled_error', { requestId: req.id, error: err?.message, stack: err?.stack });
  }
  res.status(status).json({ error: { code, message, requestId: req.id, ...(details && { details }) } });
}
