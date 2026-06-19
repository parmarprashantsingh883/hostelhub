import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { notify } from '../services/notification.service.js';

/** POST /api/complaints (tenant) */
export const createComplaint = asyncHandler(async (req, res) => {
  const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const complaint = await Complaint.create({
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority || 'medium',
    tenantId: req.user._id,
    roomId: req.user.tenantProfile?.roomId || null,
    images,
  });

  // Notify all admins
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      notify(a._id, {
        title: 'New complaint',
        message: `${req.user.name}: ${complaint.title} (${complaint.category})`,
        type: 'complaint_update',
        link: '/admin/complaints',
      }),
    ),
  );

  res.status(201).json({ success: true, data: { complaint } });
});

/** GET /api/complaints?status=&category=&priority=&page=&limit=
 *  admin → all, staff → assigned to them, tenant → their own */
export const listComplaints = asyncHandler(async (req, res) => {
  const { status, category, priority, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (category) q.category = category;
  if (priority) q.priority = priority;
  if (req.user.role === 'tenant') q.tenantId = req.user._id;
  if (req.user.role === 'staff') q.assignedStaffId = req.user._id;

  const [complaints, total] = await Promise.all([
    Complaint.find(q)
      .populate('tenantId', 'name phone')
      .populate('roomId', 'roomNumber floor')
      .populate('assignedStaffId', 'name staffProfile.staffType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Complaint.countDocuments(q),
  ]);

  res.json({ success: true, data: { complaints, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/complaints/:id */
export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('tenantId', 'name phone email')
    .populate('roomId', 'roomNumber floor')
    .populate('assignedStaffId', 'name staffProfile.staffType')
    .populate('staffNotes.by', 'name');
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (req.user.role === 'tenant' && String(complaint.tenantId._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your complaint');
  }
  if (req.user.role === 'staff' && String(complaint.assignedStaffId?._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not assigned to you');
  }
  res.json({ success: true, data: { complaint } });
});

/** PUT /api/complaints/:id (admin) — priority / remarks */
export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (req.body.priority) complaint.priority = req.body.priority;
  if (req.body.adminRemarks !== undefined) complaint.adminRemarks = req.body.adminRemarks;
  await complaint.save();
  res.json({ success: true, data: { complaint } });
});

/** PUT /api/complaints/:id/assign { staffId } (admin) */
export const assignComplaint = asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  const [complaint, staff] = await Promise.all([
    Complaint.findById(req.params.id),
    User.findOne({ _id: staffId, role: 'staff', isActive: true }),
  ]);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (!staff) throw new ApiError(404, 'Staff member not found or inactive');

  complaint.assignedStaffId = staff._id;
  complaint.status = 'assigned';
  await complaint.save();

  await notify(staff._id, {
    title: 'Complaint assigned to you',
    message: `${complaint.title} (${complaint.category}) — priority ${complaint.priority}`,
    type: 'complaint_update',
    link: '/staff/complaints',
  });
  await notify(complaint.tenantId, {
    title: 'Complaint update',
    message: `Your complaint "${complaint.title}" was assigned to ${staff.name}.`,
    type: 'complaint_update',
    link: '/tenant/complaints',
  });

  res.json({ success: true, data: { complaint } });
});

/** PUT /api/complaints/:id/status { status, note } (admin/staff) */
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['pending', 'assigned', 'in_progress', 'resolved', 'rejected'];
  if (!allowed.includes(status)) throw new ApiError(422, `Status must be one of: ${allowed.join(', ')}`);

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (req.user.role === 'staff') {
    if (String(complaint.assignedStaffId) !== String(req.user._id)) {
      throw new ApiError(403, 'Not assigned to you');
    }
    // Staff can only progress their own assignment
    if (!['in_progress', 'resolved'].includes(status)) {
      throw new ApiError(403, 'Staff can set in_progress or resolved only');
    }
  }

  complaint.status = status;
  if (status === 'resolved') complaint.resolvedAt = new Date();
  if (note) complaint.staffNotes.push({ note, by: req.user._id });
  await complaint.save();

  await notify(complaint.tenantId, {
    title: 'Complaint update',
    message: `"${complaint.title}" is now ${status.replace('_', ' ')}.`,
    type: 'complaint_update',
    link: '/tenant/complaints',
  });

  res.json({ success: true, data: { complaint } });
});

/** POST /api/complaints/:id/feedback { rating, feedback } (tenant) */
export const addFeedback = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (String(complaint.tenantId) !== String(req.user._id)) throw new ApiError(403, 'Not your complaint');
  if (complaint.status !== 'resolved') throw new ApiError(422, 'Feedback allowed only after resolution');

  complaint.rating = Number(req.body.rating);
  complaint.tenantFeedback = req.body.feedback || '';
  await complaint.save();
  res.json({ success: true, data: { complaint } });
});
