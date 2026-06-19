import User from '../models/User.js';
import Room from '../models/Room.js';
import Rent from '../models/Rent.js';
import Complaint from '../models/Complaint.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

/** POST /api/tenants (admin) — create tenant account */
export const createTenant = asyncHandler(async (req, res) => {
  const { name, email, phone, password, tenantProfile } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');

  const tenant = await User.create({
    name,
    email,
    phone,
    password: password || 'Tenant@123',
    role: 'tenant',
    tenantProfile: {
      status: 'active',
      joiningDate: new Date(),
      ...tenantProfile,
    },
  });

  // Optional immediate room assignment
  if (tenantProfile?.roomId) {
    const room = await Room.findById(tenantProfile.roomId);
    if (room && room.assignedTenants.length < room.capacity && room.status !== 'maintenance') {
      room.assignedTenants.push(tenant._id);
      await room.save();
      if (!tenant.tenantProfile.rentAmount) {
        tenant.tenantProfile.rentAmount = room.rentAmount;
        await tenant.save({ validateBeforeSave: false });
      }
    } else {
      tenant.tenantProfile.roomId = null;
      await tenant.save({ validateBeforeSave: false });
    }
  }

  res.status(201).json({ success: true, data: { tenant } });
});

/** GET /api/tenants?status=&search=&roomId=&page=&limit= (admin/staff) */
export const listTenants = asyncHandler(async (req, res) => {
  const { status, search, roomId, page = 1, limit = 50 } = req.query;
  const q = { role: 'tenant' };
  if (status) q['tenantProfile.status'] = status;
  if (roomId) q['tenantProfile.roomId'] = roomId;
  if (search) {
    q.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [tenants, total] = await Promise.all([
    User.find(q)
      .populate('tenantProfile.roomId', 'roomNumber floor roomType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(q),
  ]);

  res.json({ success: true, data: { tenants, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/tenants/:id — admin/staff, or the tenant themself */
export const getTenant = asyncHandler(async (req, res) => {
  if (req.user.role === 'tenant' && String(req.user._id) !== req.params.id) {
    throw new ApiError(403, 'You can only view your own profile');
  }
  const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' }).populate(
    'tenantProfile.roomId',
    'roomNumber floor roomType rentAmount facilities',
  );
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  res.json({ success: true, data: { tenant } });
});

/** PUT /api/tenants/:id (admin) */
export const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const { name, phone, isActive, tenantProfile } = req.body;
  if (name !== undefined) tenant.name = name;
  if (phone !== undefined) tenant.phone = phone;
  if (isActive !== undefined) tenant.isActive = isActive;
  if (tenantProfile) {
    tenant.tenantProfile = {
      ...(tenant.tenantProfile?.toObject?.() || tenant.tenantProfile || {}),
      ...tenantProfile,
    };
  }
  await tenant.save({ validateBeforeSave: false });
  res.json({ success: true, data: { tenant } });
});

/** DELETE /api/tenants/:id (admin) — soft deactivate + detach from room */
export const deactivateTenant = asyncHandler(async (req, res) => {
  const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  if (tenant.tenantProfile?.roomId) {
    const room = await Room.findById(tenant.tenantProfile.roomId);
    if (room) {
      room.assignedTenants = room.assignedTenants.filter((t) => String(t) !== String(tenant._id));
      await room.save();
    }
  }

  tenant.isActive = false;
  tenant.tenantProfile = {
    ...(tenant.tenantProfile?.toObject?.() || {}),
    roomId: null,
    status: 'moved_out',
    moveOutDate: new Date(),
  };
  await tenant.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Tenant deactivated and moved out' });
});

/** GET /api/tenants/:id/rent — rent history for a tenant */
export const tenantRents = asyncHandler(async (req, res) => {
  if (req.user.role === 'tenant' && String(req.user._id) !== req.params.id) {
    throw new ApiError(403, 'You can only view your own rent');
  }
  const rents = await Rent.find({ tenantId: req.params.id })
    .populate('roomId', 'roomNumber')
    .sort({ year: -1, month: -1 });
  res.json({ success: true, data: { rents } });
});

/** GET /api/tenants/:id/complaints */
export const tenantComplaints = asyncHandler(async (req, res) => {
  if (req.user.role === 'tenant' && String(req.user._id) !== req.params.id) {
    throw new ApiError(403, 'You can only view your own complaints');
  }
  const complaints = await Complaint.find({ tenantId: req.params.id })
    .populate('assignedStaffId', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { complaints } });
});
