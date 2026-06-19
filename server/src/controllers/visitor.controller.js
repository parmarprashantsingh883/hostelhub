import Visitor from '../models/Visitor.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { notify } from '../services/notification.service.js';

/** POST /api/visitors (tenant) — register expected visitor */
export const createVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.create({
    tenantId: req.user._id,
    visitorName: req.body.visitorName,
    visitorPhone: req.body.visitorPhone,
    purpose: req.body.purpose,
    expectedDateTime: req.body.expectedDateTime,
  });
  res.status(201).json({ success: true, data: { visitor } });
});

/** GET /api/visitors?status=&date=&tenantId=
 *  admin/staff → all (filterable); tenant → own */
export const listVisitors = asyncHandler(async (req, res) => {
  const { status, date, tenantId, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (tenantId) q.tenantId = tenantId;
  if (req.user.role === 'tenant') q.tenantId = req.user._id;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    q.expectedDateTime = { $gte: d, $lt: next };
  }

  const [visitors, total] = await Promise.all([
    Visitor.find(q)
      .populate('tenantId', 'name phone tenantProfile.roomId')
      .populate('approvedBy', 'name')
      .sort({ expectedDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Visitor.countDocuments(q),
  ]);

  res.json({ success: true, data: { visitors, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/visitors/:id */
export const getVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id)
    .populate('tenantId', 'name phone')
    .populate('approvedBy', 'name');
  if (!visitor) throw new ApiError(404, 'Visitor not found');
  if (req.user.role === 'tenant' && String(visitor.tenantId._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your visitor');
  }
  res.json({ success: true, data: { visitor } });
});

/** PUT /api/visitors/:id/check-in (staff/admin) */
export const checkIn = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found');
  if (visitor.status !== 'expected') throw new ApiError(422, `Cannot check in a ${visitor.status} visitor`);

  visitor.status = 'checked_in';
  visitor.entryTime = new Date();
  visitor.approvedBy = req.user._id;
  await visitor.save();

  await notify(visitor.tenantId, {
    title: 'Visitor arrived',
    message: `${visitor.visitorName} has checked in.`,
    type: 'visitor',
    link: '/tenant/visitors',
  });

  res.json({ success: true, data: { visitor } });
});

/** PUT /api/visitors/:id/check-out (staff/admin) */
export const checkOut = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found');
  if (visitor.status !== 'checked_in') throw new ApiError(422, 'Visitor is not checked in');

  visitor.status = 'checked_out';
  visitor.exitTime = new Date();
  await visitor.save();
  res.json({ success: true, data: { visitor } });
});

/** PUT /api/visitors/:id/reject (staff/admin) */
export const reject = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found');
  if (visitor.status !== 'expected') throw new ApiError(422, `Cannot reject a ${visitor.status} visitor`);

  visitor.status = 'rejected';
  visitor.approvedBy = req.user._id;
  await visitor.save();

  await notify(visitor.tenantId, {
    title: 'Visitor rejected',
    message: `${visitor.visitorName}'s entry was rejected by security.`,
    type: 'visitor',
    link: '/tenant/visitors',
  });

  res.json({ success: true, data: { visitor } });
});
