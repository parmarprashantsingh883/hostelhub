import Room from '../models/Room.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

/** POST /api/rooms (admin) */
export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create(req.body);
  res.status(201).json({ success: true, data: { room } });
});

/** GET /api/rooms?status=&roomType=&floor=&search=&page=&limit= */
export const listRooms = asyncHandler(async (req, res) => {
  const { status, roomType, floor, search, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (roomType) q.roomType = roomType;
  if (floor !== undefined && floor !== '') q.floor = Number(floor);
  if (search) q.roomNumber = { $regex: search, $options: 'i' };

  const [rooms, total] = await Promise.all([
    Room.find(q)
      .populate('assignedTenants', 'name email phone')
      .sort({ floor: 1, roomNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Room.countDocuments(q),
  ]);

  res.json({ success: true, data: { rooms, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/rooms/:id */
export const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('assignedTenants', 'name email phone tenantProfile');
  if (!room) throw new ApiError(404, 'Room not found');
  res.json({ success: true, data: { room } });
});

/** PUT /api/rooms/:id (admin) */
export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');

  const allowed = ['roomNumber', 'floor', 'roomType', 'capacity', 'rentAmount', 'status', 'facilities'];
  for (const k of allowed) if (req.body[k] !== undefined) room[k] = req.body[k];

  if (room.capacity < room.assignedTenants.length) {
    throw new ApiError(422, `Capacity cannot be below current occupancy (${room.assignedTenants.length})`);
  }
  await room.save();
  res.json({ success: true, data: { room } });
});

/** DELETE /api/rooms/:id (admin) */
export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.assignedTenants.length > 0) {
    throw new ApiError(422, 'Cannot delete a room with assigned tenants — move them out first');
  }
  await room.deleteOne();
  res.json({ success: true, message: 'Room deleted' });
});

/** PUT /api/rooms/:id/assign-tenant  { tenantId } (admin) */
export const assignTenant = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  const [room, tenant] = await Promise.all([
    Room.findById(req.params.id),
    User.findOne({ _id: tenantId, role: 'tenant' }),
  ]);
  if (!room) throw new ApiError(404, 'Room not found');
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  if (room.status === 'maintenance') throw new ApiError(422, 'Room is under maintenance');
  if (room.assignedTenants.length >= room.capacity) throw new ApiError(422, 'Room is full');
  if (room.assignedTenants.some((t) => String(t) === String(tenantId))) {
    throw new ApiError(409, 'Tenant already assigned to this room');
  }

  // Detach from any previous room first
  if (tenant.tenantProfile?.roomId) {
    await Room.findByIdAndUpdate(tenant.tenantProfile.roomId, {
      $pull: { assignedTenants: tenant._id },
    }).then((r) => r?.save?.());
    const prev = await Room.findById(tenant.tenantProfile.roomId);
    if (prev) await prev.save(); // re-derive status
  }

  room.assignedTenants.push(tenant._id);
  await room.save();

  tenant.tenantProfile = {
    ...(tenant.tenantProfile?.toObject?.() || tenant.tenantProfile || {}),
    roomId: room._id,
    rentAmount: tenant.tenantProfile?.rentAmount || room.rentAmount,
    status: 'active',
  };
  await tenant.save({ validateBeforeSave: false });

  res.json({ success: true, data: { room } });
});

/** PUT /api/rooms/:id/remove-tenant  { tenantId } (admin) */
export const removeTenant = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');

  room.assignedTenants = room.assignedTenants.filter((t) => String(t) !== String(tenantId));
  await room.save();

  await User.findByIdAndUpdate(tenantId, { $set: { 'tenantProfile.roomId': null } });

  res.json({ success: true, data: { room } });
});
