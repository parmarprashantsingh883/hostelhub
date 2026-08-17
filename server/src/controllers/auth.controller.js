import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { TRIAL_DAYS, TRIAL_PLAN } from '../lib/plans.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signMfaToken,
  verifyMfaToken,
  sha256,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '../utils/jwt.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';
import { putFile } from '../services/storage.service.js';
import QRCode from 'qrcode';
import { recordAudit } from '../services/audit.service.js';
import { generateSecret, keyuri, verify as verifyTotp } from '../lib/totp.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const audit = (user, action, req, meta) => recordAudit({
  orgId: user?.orgId, actorId: user?._id, actorName: user?.name, actorRole: user?.role, ip: req.ip, action, meta,
});
// Normalize a typed code (TOTP or backup) — strip separators/whitespace, lowercase.
const normCode = (c) => String(c || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

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

/** POST /api/auth/login — password step. Enforces brute-force lockout and, if
 *  the account has 2FA on, returns a short-lived mfaToken instead of a session. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockedUntil');
  // Uniform error for unknown email vs bad password (no account enumeration).
  if (!user) throw new ApiError(401, 'Invalid email or password');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    await audit(user, 'login_blocked_locked', req);
    throw new ApiError(423, `Account locked after too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }

  if (!(await user.comparePassword(password))) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    let locked = false;
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
      locked = true;
    }
    await user.save({ validateBeforeSave: false });
    await audit(user, 'login_failed', req, { locked });
    throw new ApiError(locked ? 423 : 401, locked
      ? `Too many failed attempts — account locked for ${LOCK_MINUTES} minutes.`
      : 'Invalid email or password');
  }

  if (!user.isActive) throw new ApiError(403, 'Account is deactivated — contact the admin');

  if (user.failedLoginAttempts || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save({ validateBeforeSave: false });
  }

  // 2FA gate — password verified, but require the TOTP step before a session.
  if (user.mfaEnabled) {
    return res.json({ success: true, data: { mfaRequired: true, mfaToken: signMfaToken(user) } });
  }

  await audit(user, 'login', req);
  const accessToken = await issueTokens(res, user);
  res.json({ success: true, data: { user, accessToken } });
});

/** POST /api/auth/login/mfa — second step: redeem mfaToken + TOTP/backup code. */
export const loginMfa = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;
  let decoded;
  try { decoded = verifyMfaToken(mfaToken); }
  catch { throw new ApiError(401, 'Your verification session expired — please sign in again'); }

  const user = await User.findById(decoded.id).select('+mfaSecret +mfaBackupCodes');
  if (!user || !user.mfaEnabled) throw new ApiError(401, 'Two-factor is not enabled on this account');
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated — contact the admin');

  const okTotp = verifyTotp(code, user.mfaSecret);
  const backupIdx = (user.mfaBackupCodes || []).indexOf(sha256(normCode(code)));

  if (!okTotp && backupIdx === -1) {
    await audit(user, 'login_mfa_failed', req);
    throw new ApiError(401, 'Invalid authentication code');
  }
  if (!okTotp && backupIdx !== -1) {
    user.mfaBackupCodes.splice(backupIdx, 1); // one-time use
    await user.save({ validateBeforeSave: false });
  }

  await audit(user, 'login', req, { mfa: true, viaBackupCode: !okTotp });
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
  const url = await putFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype, folder: 'avatars' });
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { profileImage: url },
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
  await audit(user, 'password_changed', req);
  res.json({ success: true, message: 'Password changed' });
});

/** POST /api/auth/mfa/setup — generate a secret + QR; not enabled until verified. */
export const mfaSetup = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaSecret');
  if (user.mfaEnabled) throw new ApiError(400, 'Two-factor is already enabled');
  const secret = generateSecret();
  user.mfaSecret = secret;
  await user.save({ validateBeforeSave: false });
  const otpauth = keyuri(user.email, 'Quarters', secret);
  const qr = await QRCode.toDataURL(otpauth);
  res.json({ success: true, data: { secret, otpauth, qr } });
});

/** POST /api/auth/mfa/enable { code } — verify a code, turn 2FA on, return the
 *  one-time backup codes (shown to the user exactly once). */
export const mfaEnable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaSecret');
  if (user.mfaEnabled) throw new ApiError(400, 'Two-factor is already enabled');
  if (!user.mfaSecret) throw new ApiError(400, 'Start the setup step first');
  if (!verifyTotp(req.body.code, user.mfaSecret)) {
    throw new ApiError(400, 'That code isn’t valid — check your authenticator app and try again');
  }
  const plain = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
  user.mfaBackupCodes = plain.map((c) => sha256(c));
  user.mfaEnabled = true;
  await user.save({ validateBeforeSave: false });
  await audit(user, 'mfa_enabled', req);
  // grouped for readability (xxxx-xxxx); input is separator-insensitive
  res.json({ success: true, data: { backupCodes: plain.map((c) => `${c.slice(0, 4)}-${c.slice(4)}`) } });
});

/** POST /api/auth/mfa/disable { password, code } — requires password + a valid code. */
export const mfaDisable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +mfaSecret +mfaBackupCodes');
  if (!user.mfaEnabled) throw new ApiError(400, 'Two-factor is not enabled');
  if (!(await user.comparePassword(req.body.password || ''))) throw new ApiError(401, 'Password is incorrect');
  const okTotp = verifyTotp(req.body.code, user.mfaSecret);
  const okBackup = (user.mfaBackupCodes || []).includes(sha256(normCode(req.body.code)));
  if (!okTotp && !okBackup) throw new ApiError(400, 'Invalid authentication code');
  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaBackupCodes = undefined;
  await user.save({ validateBeforeSave: false });
  await audit(user, 'mfa_disabled', req);
  res.json({ success: true, message: 'Two-factor authentication disabled' });
});

/** GET /api/auth/export-data — DPDP right-to-access: the caller's own data as
 *  a downloadable JSON. Queries run inside the org tenant context (protect), so
 *  they are org-scoped as well as subject-scoped. */
export const exportData = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const account = await User.findById(uid).populate('tenantProfile.roomId', 'roomNumber floor roomType rentAmount');
  const grab = (name, query) => (mongoose.models[name] ? mongoose.models[name].find(query).lean() : Promise.resolve([]));

  const data = { exportedAt: new Date().toISOString(), account };
  if (req.user.role === 'tenant') {
    Object.assign(data, {
      rents: await grab('Rent', { tenantId: uid }),
      payments: await grab('Payment', { tenantId: uid }),
      complaints: await grab('Complaint', { tenantId: uid }),
      visitors: await grab('Visitor', { tenantId: uid }),
      agreements: await grab('Agreement', { tenantId: uid }),
      depositLedger: await grab('DepositLedger', { tenantId: uid }),
      documents: await grab('Document', { userId: uid }),
    });
  } else if (req.user.role === 'staff') {
    Object.assign(data, {
      attendance: await grab('Attendance', { staffId: uid }),
      payroll: await grab('Payroll', { staffId: uid }),
    });
  } else if (req.user.role === 'admin') {
    data.organization = await Organization.findById(req.user.orgId).lean();
    data.settings = (await grab('Settings', {}))[0] || null;
  }
  await audit(req.user, 'data_exported', req);
  res.json({ success: true, data });
});

/** DELETE /api/auth/account — DPDP right-to-erasure. The org OWNER (admin)
 *  permanently deletes the entire organization and every record scoped to it.
 *  Residents/staff data is controlled by their PG operator, so they are routed
 *  to their admin. Requires the current password. */
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  if (!(await user.comparePassword(req.body.password || ''))) {
    throw new ApiError(401, 'Password is incorrect');
  }
  if (user.role !== 'admin') {
    throw new ApiError(403, 'Only the account owner can delete the organization. Ask your admin to remove your account.');
  }
  const orgId = user.orgId;
  if (!orgId) throw new ApiError(400, 'No organization is associated with this account');

  // Delete every org-scoped document. deleteMany runs inside the tenant context
  // (protect → runWithTenant), so the plugin scopes each to THIS org only.
  const deleted = {};
  for (const [name, model] of Object.entries(mongoose.models)) {
    if (name === 'Organization') continue;
    if (model.schema.path('orgId')) {
      const r = await model.deleteMany({});
      if (r.deletedCount) deleted[name] = r.deletedCount;
    }
  }
  await Organization.findByIdAndDelete(orgId);

  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ success: true, message: 'Your organization and all its data have been permanently deleted.', data: { deleted } });
});
