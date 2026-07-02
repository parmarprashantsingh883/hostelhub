import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

export const INSPECTION_TYPES = ['move_in', 'move_out'];
export const ITEM_CONDITIONS = ['good', 'fair', 'damaged', 'missing'];

/** Default room checklist when an inspection is created without explicit items. */
export const DEFAULT_CHECKLIST = [
  'Walls & paint', 'Flooring', 'Door & lock', 'Windows', 'Bed & mattress',
  'Fan & lights', 'Electrical sockets', 'Bathroom fittings',
  'Furniture (table/chair/wardrobe)', 'Cleanliness',
];

const itemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    condition: { type: String, enum: ITEM_CONDITIONS, default: 'good' },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    // Charge for damaged/missing items — posted to the deposit on move-out.
    deduction: { type: Number, min: 0, default: 0 },
  },
  { _id: true },
);

const inspectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INSPECTION_TYPES, required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    items: { type: [itemSchema], default: [] },
    overallNote: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft', index: true },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    // True once move-out deductions were posted to the deposit ledger (no double-post).
    postedToLedger: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** Sum of per-item deductions (the move-out damage charge). */
inspectionSchema.virtual('totalDeductions').get(function () {
  return (this.items || []).reduce((s, i) => s + (i.deduction || 0), 0);
});
inspectionSchema.set('toJSON', { virtuals: true });
inspectionSchema.set('toObject', { virtuals: true });

inspectionSchema.index({ createdAt: -1 });

inspectionSchema.plugin(tenantPlugin);

export default mongoose.model('Inspection', inspectionSchema);
