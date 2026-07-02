import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

/**
 * App settings — a single document for this (single-tenant) install. Pinned by
 * `key: 'app'`. Other modules read it via getSettings() so business identity,
 * rent defaults, deposit policy, UPI payee and notification channels are all
 * configured in one place instead of scattered across env vars.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'app' },

    business: {
      name: { type: String, default: 'Quarters', trim: true, maxlength: 120 },
      address: { type: String, default: '', trim: true, maxlength: 300 },
      gstin: { type: String, default: '', trim: true, maxlength: 20 },
      email: { type: String, default: '', trim: true, maxlength: 160 },
      phone: { type: String, default: '', trim: true, maxlength: 20 },
    },

    rent: {
      dueDay: { type: Number, default: 5, min: 1, max: 28 },
      graceDays: { type: Number, default: 0, min: 0, max: 30 },
      lateFeeMode: { type: String, enum: ['none', 'flat', 'percent'], default: 'none' },
      lateFeeValue: { type: Number, default: 0, min: 0 },
      electricityRatePerUnit: { type: Number, default: 8, min: 0 },
    },

    deposit: {
      defaultMonths: { type: Number, default: 1, min: 0, max: 12 },
      policyNote: { type: String, default: '', maxlength: 500 },
    },

    payments: {
      upiVpa: { type: String, default: '', trim: true, maxlength: 100 },
      upiPayeeName: { type: String, default: '', trim: true, maxlength: 120 },
    },

    notifications: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
    },

    currency: { type: String, default: 'INR' },
  },
  { timestamps: true },
);

settingsSchema.plugin(tenantPlugin);
// One settings doc per organization (the tenant plugin scopes getSettings()).
settingsSchema.index({ orgId: 1, key: 1 }, { unique: true });

export default mongoose.model('Settings', settingsSchema);
