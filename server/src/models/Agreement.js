import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

export const AGREEMENT_STATUS = ['draft', 'sent', 'signed', 'cancelled'];

/** A rental agreement for a tenant. Generated as a PDF, sent for review, then
 *  e-signed by the resident from their portal. Mirrors the tenant's
 *  tenantProfile.agreementStatus. */
const agreementSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    rentAmount: { type: Number, min: 0, default: 0 },
    depositAmount: { type: Number, min: 0, default: 0 },
    dueDay: { type: Number, min: 1, max: 28, default: 5 },
    startDate: { type: Date, default: Date.now },
    durationMonths: { type: Number, min: 1, max: 60, default: 11 },
    terms: { type: String, trim: true, maxlength: 4000, default: '' },
    status: { type: String, enum: AGREEMENT_STATUS, default: 'sent', index: true },
    pdfUrl: { type: String, default: null },
    signedAt: { type: Date, default: null },
    signerName: { type: String, trim: true, maxlength: 120, default: '' },
    signedFrom: { type: String, default: '' }, // IP at signing (light audit)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

agreementSchema.index({ createdAt: -1 });

agreementSchema.plugin(tenantPlugin);

export default mongoose.model('Agreement', agreementSchema);
