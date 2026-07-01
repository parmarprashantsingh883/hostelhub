import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { STAFF_PERMISSIONS, PERMISSION_KEYS, DEFAULT_STAFF_PERMISSIONS } from '../lib/permissions.js';

/** POST /api/staff (admin) */
export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, password, staffProfile } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');

  const staff = await User.create({
    name,
    email,
    phone,
    password: password || 'Staff@123',
    role: 'staff',
    staffProfile: { status: 'active', permissions: DEFAULT_STAFF_PERMISSIONS, ...staffProfile },
  });
  res.status(201).json({ success: true, data: { staff } });
});

/** GET /api/staff?staffType=&status=&search= (admin) */
export const listStaff = asyncHandler(async (req, res) => {
  const { staffType, status, search, page = 1, limit = 50 } = req.query;
  const q = { role: 'staff' };
  if (staffType) q['staffProfile.staffType'] = staffType;
  if (status) q['staffProfile.status'] = status;
  if (search) {
    q.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [staff, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    User.countDocuments(q),
  ]);
  res.json({ success: true, data: { staff, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/staff/:id */
export const getStaff = asyncHandler(async (req, res) => {
  if (req.user.role === 'staff' && String(req.user._id) !== req.params.id) {
    throw new ApiError(403, 'You can only view your own profile');
  }
  const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');
  res.json({ success: true, data: { staff } });
});

/** PUT /api/staff/:id (admin) */
export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');

  const { name, phone, isActive, staffProfile } = req.body;
  if (name !== undefined) staff.name = name;
  if (phone !== undefined) staff.phone = phone;
  if (isActive !== undefined) staff.isActive = isActive;
  if (staffProfile) {
    staff.staffProfile = {
      ...(staff.staffProfile?.toObject?.() || staff.staffProfile || {}),
      ...staffProfile,
    };
  }
  await staff.save({ validateBeforeSave: false });
  res.json({ success: true, data: { staff } });
});

/** DELETE /api/staff/:id (admin) — soft deactivate */
export const deactivateStaff = asyncHandler(async (req, res) => {
  const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');
  staff.isActive = false;
  staff.staffProfile = { ...(staff.staffProfile?.toObject?.() || {}), status: 'inactive' };
  await staff.save({ validateBeforeSave: false });

  // Don't strand open complaints on an inactive staff member — return them to
  // the unassigned/pending pool so they get reassigned.
  await Complaint.updateMany(
    { assignedStaffId: staff._id, status: { $in: ['assigned', 'in_progress'] } },
    { $set: { assignedStaffId: null, status: 'pending' } },
  );

  res.json({ success: true, message: 'Staff member deactivated' });
});

/** GET /api/staff/permissions — the granular permission catalog (admin). */
export const permissionCatalog = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { permissions: STAFF_PERMISSIONS } });
});

/** PUT /api/staff/:id/permissions { permissions } (admin) — set a staff member's capabilities. */
export const updatePermissions = asyncHandler(async (req, res) => {
  const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');
  const requested = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const permissions = [...new Set(requested.filter((p) => PERMISSION_KEYS.includes(p)))];
  staff.staffProfile = { ...(staff.staffProfile?.toObject?.() || staff.staffProfile || {}), permissions };
  await staff.save({ validateBeforeSave: false });
  res.json({ success: true, data: { staff } });
});

/** GET /api/staff/:id/tasks — complaints assigned to this staff member */
export const staffTasks = asyncHandler(async (req, res) => {
  if (req.user.role === 'staff' && String(req.user._id) !== req.params.id) {
    throw new ApiError(403, 'You can only view your own tasks');
  }
  const tasks = await Complaint.find({ assignedStaffId: req.params.id })
    .populate('tenantId', 'name phone')
    .populate('roomId', 'roomNumber floor')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { tasks } });
});
