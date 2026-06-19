import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './error.middleware.js';

/** Verify Bearer access token, attach req.user. */
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
  next();
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
