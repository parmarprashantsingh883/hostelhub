import crypto from 'crypto';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '../utils/jwt.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = sha256(refreshToken);
  await user.save({ validateBeforeSave: false });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

/** POST /api/auth/register — public signup always creates a TENANT.
 *  Admin + staff accounts are created by the admin (staff/tenant modules). */
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'tenant',
    tenantProfile: { status: 'active', joiningDate: new Date() },
  });

  const accessToken = await issueTokens(res, user);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated — contact the admin');

  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { user, accessToken } });
});

/** POST /api/auth/refresh — rotate refresh token, mint new access token. */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, 'No refresh token');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Refresh token expired — log in again');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== sha256(token)) {
    throw new ApiError(401, 'Refresh token revoked — log in again');
  }

  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { user, accessToken } });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
    } catch {
      /* already invalid */
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

/** POST /api/auth/forgot-password */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always 200 — do not leak whether the email exists
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = sha256(raw);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const link = `${process.env.CLIENT_URL}/reset-password?token=${raw}`;
    const tpl = emailTemplates.resetPassword(user.name, link);
    await sendEmail({ to: user.email, ...tpl });
  }
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

/** POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    resetPasswordToken: sha256(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokenHash = undefined; // revoke all sessions
  await user.save();

  res.json({ success: true, message: 'Password reset — you can now log in.' });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('tenantProfile.roomId', 'roomNumber floor roomType rentAmount');
  res.json({ success: true, data: { user } });
});

/** PUT /api/auth/profile */
export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'profileImage'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
});

/** PUT /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  user.password = newPassword;
  user.refreshTokenHash = undefined; // revoke other sessions
  await user.save();
  res.json({ success: true, message: 'Password changed' });
});
