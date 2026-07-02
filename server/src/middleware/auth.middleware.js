import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './error.middleware.js';
import { runWithTenant } from '../lib/tenantContext.js';
import { assertWritable } from './subscription.middleware.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Auth + billing must stay reachable when a subscription lapses (renewal path).
const SUBSCRIPTION_EXEMPT = /^\/api\/(auth|billing)(\/|$)/;

/** Verify Bearer access token, attach req.user, establish the org context
 *  every downstream query is scoped by, and freeze writes for lapsed orgs. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired — please log in again');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated');

  req.user = user;
  if (!user.orgId) return next(); // legacy/ops accounts — unscoped

  if (MUTATING.has(req.method) && !SUBSCRIPTION_EXEMPT.test(req.originalUrl)) {
    await assertWritable(user.orgId);
  }
  return runWithTenant(user.orgId, next);
});

/** Role gate: authorize('admin'), authorize('admin', 'staff'), … */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission for this action'));
    }
    next();
  };

/** Fine-grained gate for staff actions. Admins always pass; staff pass only if
 *  the capability is in their staffProfile.permissions. Use AFTER authorize(). */
export const requirePermission =
  (key) =>
  (req, _res, next) => {
    if (req.user?.role === 'admin') return next();
    if (req.user?.role === 'staff' && (req.user.staffProfile?.permissions || []).includes(key)) return next();
    return next(new ApiError(403, `You don't have permission for this — ask an admin to grant "${key}".`));
  };
