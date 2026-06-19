import mongoose from 'mongoose';

const rentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2020 },
    rentAmount: { type: Number, required: true, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'razorpay', null],
      default: null,
    },
    transactionId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true },
);

// One rent record per tenant per month
rentSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

// Recompute total before save
rentSchema.pre('save', function (next) {
  this.totalAmount = Math.max(0, this.rentAmount + (this.lateFee || 0) - (this.discount || 0));
  next();
});

export default mongoose.model('Rent', rentSchema);
