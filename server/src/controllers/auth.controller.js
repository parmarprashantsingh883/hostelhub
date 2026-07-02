import crypto from 'crypto';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { TRIAL_DAYS, TRIAL_PLAN } from '../lib/plans.js';
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

/** POST /api/auth/register — SaaS signup: creates an Organization (the
 *  hostel/PG business) plus its owner admin account, and starts a free trial.
 *  Residents and staff are added by the admin from inside the app. */
export const register = asyncHandler(async (req, res) => {
  const { hostelName, name, email, phone, password } = req.body;
  if (!hostelName?.trim()) throw new ApiError(400, 'Hostel / PG name is required');
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');

  const org = await Organization.create({
    name: hostelName.trim(),
    slug: await Organization.generateSlug(hostelName),
    email,
    phone,
    subscription: {
      planId: TRIAL_PLAN,
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
      history: [{ event: 'trial_started', planId: TRIAL_PLAN }],
    },
  });

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'admin',
    orgId: org._id,
  });

  const accessToken = await issueTokens(res, user);
  res.status(201).json({ success: true, data: { user, accessToken, organization: org } });
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
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;

  // Tenants may maintain their own emergency & guardian contacts.
  if (user.role === 'tenant' && user.tenantProfile) {
    const merge = (cur, patch) => ({ ...(cur?.toObject?.() ?? cur ?? {}), ...patch });
    if (req.body.emergencyContact) user.tenantProfile.emergencyContact = merge(user.tenantProfile.emergencyContact, req.body.emergencyContact);
    if (req.body.guardianDetails) user.tenantProfile.guardianDetails = merge(user.tenantProfile.guardianDetails, req.body.guardianDetails);
  }

  await user.save();
  await user.populate('tenantProfile.roomId', 'roomNumber floor roomType rentAmount');
  res.json({ success: true, data: { user } });
});

/** PUT /api/auth/avatar (multipart: avatar) — upload a profile photo. */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { profileImage: `/uploads/${req.file.filename}` },
    { new: true },
  ).populate('tenantProfile.roomId', 'roomNumber floor roomType rentAmount');
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
