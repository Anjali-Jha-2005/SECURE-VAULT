import { AppError } from '../utils/errors.js';

/** Validates and replaces req.body. Error details never echo the submitted values. */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details));
  }
  req.body = result.data;
  next();
};
