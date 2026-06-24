import mongoose from 'mongoose';

/**
 * Deposit ledger — one document per tenant. The running deposit balance is
 * derived from the entries array (deposit credits the held amount; deduction
 * and refund debit it). This is an additive settlement layer keyed by tenantId
 * and is intentionally decoupled from the existing tenant move-out flow.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deposit', 'deduction', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const depositLedgerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    entries: { type: [ledgerEntrySchema], default: [] },
    // Set once when a settlement is finalised; lets the UI show closed status.
    settledAt: { type: Date, default: null },
    settlementUrl: { type: String, default: null },
  },
  { timestamps: true },
);

/** Held deposit = sum(deposits) − sum(deductions) − sum(refunds). */
depositLedgerSchema.virtual('depositHeld').get(function () {
  return (this.entries || []).reduce((bal, e) => {
    if (e.type === 'deposit') return bal + e.amount;
    return bal - e.amount; // deduction & refund both reduce what's held
  }, 0);
});

/** Sum of deduction entries only — used in the settlement maths. */
depositLedgerSchema.virtual('totalDeductions').get(function () {
  return (this.entries || [])
    .filter((e) => e.type === 'deduction')
    .reduce((s, e) => s + e.amount, 0);
});

depositLedgerSchema.set('toJSON', { virtuals: true });
depositLedgerSchema.set('toObject', { virtuals: true });

export default mongoose.model('DepositLedger', depositLedgerSchema);
