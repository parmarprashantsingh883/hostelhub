import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

const paymentSchema = new mongoose.Schema(
  {
    rentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rent', required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'razorpay'],
      required: true,
    },
    gatewayOrderId: { type: String, default: null },
    gatewayPaymentId: { type: String, default: null },
    gatewaySignature: { type: String, default: null },
    status: {
      type: String,
      enum: ['created', 'success', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

paymentSchema.plugin(tenantPlugin);

export default mongoose.model('Payment', paymentSchema);
