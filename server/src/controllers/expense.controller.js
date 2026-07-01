import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import Rent from '../models/Rent.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { moveToTrash } from '../services/recyclebin.service.js';

/** Resolve month/year from query, defaulting to the current month. */
const resolvePeriod = (query) => {
  const now = new Date();
  const month = Number(query.month) || now.getMonth() + 1;
  const year = Number(query.year) || now.getFullYear();
  return { month, year };
};

/** Inclusive [start, end) date range for a given month/year. */
const monthRange = (month, year) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 1),
});

/** POST /api/expenses (admin) */
export const createExpense = asyncHandler(async (req, res) => {
  const { category, amount, date, vendor, note } = req.body;
  const expense = await Expense.create({
    category,
    amount,
    date: date || new Date(),
    vendor,
    note,
    createdBy: req.user?._id,
  });
  res.status(201).json({ success: true, data: { expense } });
});

/** GET /api/expenses?month=&year=&category=&page=&limit= (admin) */
export const listExpenses = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 100 } = req.query;
  const { month, year } = resolvePeriod(req.query);
  const { start, end } = monthRange(month, year);

  const q = { date: { $gte: start, $lt: end } };
  if (category) {
    if (!EXPENSE_CATEGORIES.includes(category)) throw new ApiError(422, 'Invalid category');
    q.category = category;
  }

  const [expenses, total] = await Promise.all([
    Expense.find(q)
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Expense.countDocuments(q),
  ]);

  res.json({
    success: true,
    data: { expenses, total, month, year, page: Number(page), limit: Number(limit) },
  });
});

/** DELETE /api/expenses/:id (admin) */
export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found');
  await moveToTrash({ type: 'Expense', doc: expense, label: `${expense.category} · ₹${expense.amount}`, userId: req.user._id });
  await expense.deleteOne();
  res.json({ success: true, message: 'Expense deleted' });
});

/**
 * GET /api/expenses/summary?month=&year= (admin)
 * Returns P&L for the month:
 *   income   = sum of PAID Rent.totalAmount for the month
 *   expenses = sum of Expense.amount for the month (+ breakdown by category)
 *   net      = income - expenses
 */
export const expenseSummary = asyncHandler(async (req, res) => {
  const { month, year } = resolvePeriod(req.query);
  const { start, end } = monthRange(month, year);

  const [byCategoryAgg, incomeAgg] = await Promise.all([
    // Expenses grouped by category, within the date range
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    // Income = paid rent for this month/year (Rent stores month/year fields)
    Rent.aggregate([
      { $match: { status: 'paid', month, year } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
  ]);

  // Normalise category breakdown so every category is present (zero-filled).
  const totals = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0]));
  let totalExpenses = 0;
  let topCategory = null;
  for (const row of byCategoryAgg) {
    totals[row._id] = row.total;
    totalExpenses += row.total;
    if (!topCategory || row.total > topCategory.total) {
      topCategory = { category: row._id, total: row.total };
    }
  }

  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: totals[category],
  }));

  const income = incomeAgg[0]?.total || 0;
  const net = income - totalExpenses;

  res.json({
    success: true,
    data: {
      month,
      year,
      income,
      paidRentCount: incomeAgg[0]?.count || 0,
      expenses: totalExpenses,
      net,
      topCategory, // { category, total } | null
      byCategory, // [{ category, total }] — every category, zero-filled
    },
  });
});
