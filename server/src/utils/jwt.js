import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function signAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/** Short-lived token issued after password step, redeemed at the MFA step. */
export function signMfaToken(user) {
  return jwt.sign({ id: user._id, purpose: 'mfa' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
}
export function verifyMfaToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (decoded.purpose !== 'mfa') throw new Error('wrong token purpose');
  return decoded;
}

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

export const REFRESH_COOKIE = 'hh_refresh';

export const refreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // SameSite=None (with Secure) lets the cookie ride cross-site requests —
    // required when the frontend (Vercel) and API (Render) are on different
    // origins. Locally we stay on Lax over http.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};
