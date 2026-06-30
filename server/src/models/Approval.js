import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from './Expense.js';

export const APPROVAL_TYPES = ['expense', 'purchase', 'discount', 'refund', 'leave', 'other'];
export const APPROVAL_STATUS = ['pending', 'approved', 'rejected'];

/** An approval request raised by staff/admin and signed off by an admin.
 *  Approving an expense/purchase posts the amount to P&L as an Expense. */
const approvalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: APPROVAL_TYPES, default: 'expense', index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    amount: { type: Number, min: 0, default: 0 },
    // Expense bucket used when an approved expense/purchase posts to P&L.
    expenseCategory: { type: String, enum: EXPENSE_CATEGORIES, default: 'supplies' },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: APPROVAL_STATUS, default: 'pending', index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, maxlength: 500, default: '' },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  },
  { timestamps: true },
);

approvalSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Approval', approvalSchema);
