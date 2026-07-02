import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

export const VENDOR_CATEGORIES = [
  'electrical', 'plumbing', 'carpentry', 'cleaning', 'appliance',
  'internet', 'pest_control', 'painting', 'security', 'general',
];

/** A service provider the property uses for upkeep (electrician, plumber, cook…). */
const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    category: { type: String, enum: VENDOR_CATEGORIES, default: 'general', index: true },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

vendorSchema.plugin(tenantPlugin);

export default mongoose.model('Vendor', vendorSchema);
