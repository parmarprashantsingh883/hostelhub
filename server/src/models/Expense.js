import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'maintenance',
  'utilities',
  'salaries',
  'supplies',
  'rent',
  'marketing',
  'other',
];

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: [true, 'Category is required'],
      default: 'other',
      index: true,
    },
    amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
    date: { type: Date, required: true, default: Date.now, index: true },
    vendor: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1, category: 1 });

export default mongoose.model('Expense', expenseSchema);
