import mongoose from 'mongoose';
import crypto from 'crypto';

/** Short, unambiguous gate pass — e.g. "QV-9F3A21". Encoded into the visitor's
 *  QR pass; security scans (or types) it to check the visitor in. */
export const genPassCode = () => `QV-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;

const visitorSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitorName: { type: String, required: true, trim: true, maxlength: 100 },
    visitorPhone: { type: String, required: true, trim: true, maxlength: 20 },
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
    expectedDateTime: { type: Date, required: true },
    // Gate-pass code carried by the visitor's QR pass (unique per visit).
    passCode: { type: String, unique: true, index: true, default: genPassCode },
    entryTime: { type: Date, default: null },
    exitTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['expected', 'checked_in', 'checked_out', 'rejected'],
      default: 'expected',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

visitorSchema.index({ expectedDateTime: -1 });

export default mongoose.model('Visitor', visitorSchema);
