import Approval, { APPROVAL_TYPES, APPROVAL_STATUS } from '../models/Approval.js';
import { EXPENSE_CATEGORIES } from '../models/Expense.js';
import Expense from '../models/Expense.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { notify } from '../services/notification.service.js';

const populate = (q) => q.populate('requestedBy', 'name role').populate('decidedBy', 'name');

/** GET /api/approvals?status=&type= — admin sees all; staff sees their own. */
export const listApprovals = asyncHandler(async (req, res) => {
  const q = {};
  if (req.user.role !== 'admin') q.requestedBy = req.user._id;
  if (req.query.status) q.status = req.query.status;
  if (req.query.type) q.type = req.query.type;

  const [approvals, counts] = await Promise.all([
    populate(Approval.find(q)).sort({ createdAt: -1 }),
    Approval.aggregate([
      ...(req.user.role !== 'admin' ? [{ $match: { requestedBy: req.user._id } }] : []),
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
  ]);
  const byStatus = Object.fromEntries(APPROVAL_STATUS.map((s) => [s, 0]));
  counts.forEach((c) => { byStatus[c._id] = c.n; });
  res.json({ success: true, data: { approvals, counts: byStatus } });
});

/** POST /api/approvals (admin/staff) — raise a request. */
export const createApproval = asyncHandler(async (req, res) => {
  const { type = 'expense', title, amount, expenseCategory, reason } = req.body;
  if (!APPROVAL_TYPES.includes(type)) throw new ApiError(400, 'Invalid request type');
  if (!title) throw new ApiError(400, 'A title is required');
  if (expenseCategory && !EXPENSE_CATEGORIES.includes(expenseCategory)) throw new ApiError(422, 'Invalid expense category');

  const approval = await Approval.create({
    type,
    title,
    amount: Math.max(0, Number(amount) || 0),
    expenseCategory: expenseCategory || 'supplies',
    reason: reason || '',
    requestedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { approval: await populate(Approval.findById(approval._id)) } });
});

/** PUT /api/approvals/:id/decision { decision, note } (admin) — approve/reject.
 *  Approving an expense/purchase posts the amount to P&L as an Expense. */
export const decideApproval = asyncHandler(async (req, res) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) throw new ApiError(400, 'Decision must be approved or rejected');

  const approval = await Approval.findById(req.params.id);
  if (!approval) throw new ApiError(404, 'Request not found');
  if (approval.status !== 'pending') throw new ApiError(409, `This request is already ${approval.status}`);

  if (decision === 'approved' && ['expense', 'purchase'].includes(approval.type) && approval.amount > 0) {
    const exp = await Expense.create({
      category: approval.expenseCategory || 'supplies',
      amount: approval.amount,
      date: new Date(),
      vendor: '',
      note: `Approved: ${approval.title}`,
      createdBy: req.user._id,
    });
    approval.expenseId = exp._id;
  }
  approval.status = decision;
  approval.decidedBy = req.user._id;
  approval.decidedAt = new Date();
  approval.decisionNote = note || '';
  await approval.save();

  await notify(approval.requestedBy, {
    title: `Request ${decision}`,
    message: `Your request "${approval.title}" was ${decision}.`,
    type: 'general',
    link: '/staff/approvals',
  });

  res.json({ success: true, data: { approval: await populate(Approval.findById(approval._id)) } });
});

/** DELETE /api/approvals/:id — requester (while pending) or admin. */
export const deleteApproval = asyncHandler(async (req, res) => {
  const approval = await Approval.findById(req.params.id);
  if (!approval) throw new ApiError(404, 'Request not found');
  const isOwner = String(approval.requestedBy) === String(req.user._id);
  if (req.user.role !== 'admin' && !(isOwner && approval.status === 'pending')) {
    throw new ApiError(403, 'You can only delete your own pending requests');
  }
  await approval.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
