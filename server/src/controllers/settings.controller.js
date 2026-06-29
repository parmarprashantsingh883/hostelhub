import { asyncHandler } from '../middleware/error.middleware.js';
import { getSettings } from '../services/settings.service.js';

const SECTIONS = ['business', 'rent', 'deposit', 'payments', 'notifications'];

/** GET /api/settings (admin) */
export const getSettingsCtrl = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  res.json({ success: true, data: { settings } });
});

/** PUT /api/settings (admin) — merge any provided sections; schema validates ranges/enums. */
export const updateSettingsCtrl = asyncHandler(async (req, res) => {
  const s = await getSettings();
  const body = req.body || {};
  for (const section of SECTIONS) {
    if (body[section] && typeof body[section] === 'object') {
      const current = s[section]?.toObject ? s[section].toObject() : (s[section] || {});
      s[section] = { ...current, ...body[section] };
    }
  }
  await s.save(); // runs schema validators (min/max, enum)
  res.json({ success: true, data: { settings: s } });
});
