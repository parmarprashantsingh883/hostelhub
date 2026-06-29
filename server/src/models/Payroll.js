import mongoose from 'mongoose';

/** A monthly salary payment for a staff member. One per (staff, month, year).
 *  Paying creates a 'salaries' Expense so it flows into P&L. */
const payrollSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

payrollSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payroll', payrollSchema);
