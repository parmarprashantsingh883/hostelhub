import WorkOrder, { WORKORDER_STATUSES } from '../models/WorkOrder.js';
import Complaint from '../models/Complaint.js';
import Expense from '../models/Expense.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

const populateWO = (q) => q
  .populate('vendorId', 'name category phone')
  .populate('assignedStaffId', 'name')
  .populate('roomId', 'roomNumber')
  .populate('complaintId', 'title status');

/** GET /api/work-orders?status= (admin/staff) */
export const listWorkOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const [workOrders, counts] = await Promise.all([
    populateWO(WorkOrder.find(q)).sort({ createdAt: -1 }),
    WorkOrder.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(WORKORDER_STATUSES.map((s) => [s, 0]));
  counts.forEach((c) => { byStatus[c._id] = c.n; });
  res.json({ success: true, data: { workOrders, counts: byStatus } });
});

/** POST /api/work-orders (admin/staff) — standalone or raised from a complaint. */
export const createWorkOrder = asyncHandler(async (req, res) => {
  const b = req.body || {};
  let { title, description, roomId } = b;
  const { category, priority, vendorId, assignedStaffId, complaintId, cost, scheduledFor } = b;

  if (complaintId) {
    const c = await Complaint.findById(complaintId);
    if (!c) throw new ApiError(404, 'Linked complaint not found');
    title = title || c.title;
    description = description || c.description;
    roomId = roomId || c.roomId;
  }
  if (!title) throw new ApiError(400, 'Title is required');

  const status = vendorId || assignedStaffId ? 'assigned' : 'open';
  const wo = await WorkOrder.create({
    title,
    description: description || '',
    category: category || 'general',
    priority: priority || 'medium',
    status,
    vendorId: vendorId || null,
    assignedStaffId: assignedStaffId || null,
    complaintId: complaintId || null,
    roomId: roomId || null,
    cost: Math.max(0, Number(cost) || 0),
    scheduledFor: scheduledFor || null,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { workOrder: await populateWO(WorkOrder.findById(wo._id)) } });
});

/** PUT /api/work-orders/:id (admin/staff) — edit fields (not status). */
export const updateWorkOrder = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) throw new ApiError(404, 'Work order not found');
  if (wo.status === 'completed') throw new ApiError(422, 'A completed work order cannot be edited');
  for (const f of ['title', 'description', 'category', 'priority']) {
    if (req.body[f] !== undefined) wo[f] = req.body[f];
  }
  for (const f of ['vendorId', 'assignedStaffId', 'roomId', 'scheduledFor']) {
    if (req.body[f] !== undefined) wo[f] = req.body[f] || null;
  }
  if (req.body.cost !== undefined) wo.cost = Math.max(0, Number(req.body.cost) || 0);
  await wo.save();
  res.json({ success: true, data: { workOrder: await populateWO(WorkOrder.findById(wo._id)) } });
});

/** PUT /api/work-orders/:id/status { status, cost? } (admin/staff)
 *  Completing logs the cost as a maintenance Expense (once) and resolves any
 *  linked complaint. */
export const updateWorkOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!WORKORDER_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');
  const wo = await WorkOrder.findById(req.params.id).populate('vendorId', 'name');
  if (!wo) throw new ApiError(404, 'Work order not found');
  if (req.body.cost !== undefined) wo.cost = Math.max(0, Number(req.body.cost) || 0);

  if (status === 'completed' && wo.status !== 'completed') {
    wo.completedAt = new Date();
    if (wo.cost > 0 && !wo.expenseId) {
      const exp = await Expense.create({
        category: 'maintenance',
        amount: wo.cost,
        date: new Date(),
        vendor: wo.vendorId?.name || '',
        note: `Work order: ${wo.title}`,
        createdBy: req.user._id,
      });
      wo.expenseId = exp._id;
    }
    if (wo.complaintId) {
      await Complaint.findByIdAndUpdate(wo.complaintId, { status: 'resolved', resolvedAt: new Date() });
    }
  }
  wo.status = status;
  await wo.save();
  res.json({ success: true, data: { workOrder: await populateWO(WorkOrder.findById(wo._id)) } });
});

/** DELETE /api/work-orders/:id (admin) */
export const deleteWorkOrder = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) throw new ApiError(404, 'Work order not found');
  await wo.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
