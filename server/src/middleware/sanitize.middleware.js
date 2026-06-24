/**
 * Strip MongoDB operator keys from request inputs to block NoSQL operator
 * injection — e.g. `?status[$ne]=paid` or a body key like `$where`. Any key
 * starting with `$` or containing `.` is removed before it can reach a query.
 * (Express 4 exposes mutable req.body/query/params.)
 */
function scrub(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      scrub(obj[key], depth + 1);
    }
  }
}

export function sanitizeRequest(req, _res, next) {
  scrub(req.body);
  scrub(req.query);
  scrub(req.params);
  next();
}
