import { ApiError } from './error.middleware.js';

/**
 * Zod body validator middleware factory.
 *   router.post('/', validate(createRoomSchema), handler)
 * Replaces req.body with the parsed (sanitised, defaulted) data.
 */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return next(new ApiError(422, msg));
  }
  req.body = result.data;
  next();
};
