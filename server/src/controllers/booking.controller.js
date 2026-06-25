import crypto from 'crypto';
import Booking, { BOOKING_STATUSES, HOLDING_STATUSES } from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { notify } from '../services/notification.service.js';

/** Beds free to reserve in a room = capacity − current occupancy − beds already held. */
async function availableBeds(room, excludeBookingId = null) {
  const q = { roomId: room._id, status: { $in: HOLDING_STATUSES } };
  if (excludeBookingId) q._id = { $ne: excludeBookingId };
  const held = await Booking.countDocuments(q);
  return room.capacity - room.currentOccupancy - held;
}

/** Provision a tenant account from a booking and fill the bed. */
async function moveInTenant(booking) {
  const room = await Room.findById(booking.roomId);
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.status === 'maintenance') throw new ApiError(422, 'Room is under maintenance');
  if (room.currentOccupancy >= room.capacity) throw new ApiError(422, 'Room is already full');

  const email = booking.email || `${String(booking.phone).replace(/\D/g, '')}@resident.quarters.app`;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, `A user already exists with email ${email}`);

  const tenant = await User.create({
    name: booking.name,
    email,
    phone: booking.phone,
    password: `${crypto.randomBytes(6).toString('hex')}Aa1!`, // temp — resident resets on invite
    role: 'tenant',
    tenantProfile: {
      roomId: room._id,
      joiningDate: booking.moveInDate,
      rentAmount: booking.rentAmount || room.rentAmount,
      securityDeposit: booking.securityDeposit || 0,
      status: 'active',
    },
  });

  room.assignedTenants.push(tenant._id);
  await room.save(); // pre-save recomputes occupancy + status

  if (booking.leadId) {
    await Lead.findByIdAndUpdate(booking.leadId, { stage: 'converted' });
  }
  return tenant;
}

/** GET /api/bookings?status= (admin/staff) — reservation pipeline. */
export const listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const [bookings, counts] = await Promise.all([
    Booking.find(q)
      .populate('roomId', 'roomNumber roomType floor')
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 }),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  counts.forEach((c) => { byStatus[c._id] = c.n; });
  res.json({ success: true, data: { bookings, counts: byStatus } });
});

/** POST /api/bookings (admin) — reserve a bed for a prospective resident. */
export const createBooking = asyncHandler(async (req, res) => {
  const { name, phone, email, roomId, moveInDate, rentAmount, securityDeposit, tokenAmount, note, leadId } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Name and phone are required');
  if (!roomId) throw new ApiError(400, 'A room is required');
  if (!moveInDate) throw new ApiError(400, 'A move-in date is required');

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.status === 'maintenance') throw new ApiError(422, 'Room is under maintenance');
  if ((await availableBeds(room)) <= 0) throw new ApiError(422, 'No beds available in this room');

  const booking = await Booking.create({
    name, phone, email: email || '', leadId: leadId || null,
    roomId, moveInDate,
    rentAmount: rentAmount != null ? Math.max(0, Number(rentAmount)) : room.rentAmount,
    securityDeposit: Math.max(0, Number(securityDeposit) || 0),
    tokenAmount: Math.max(0, Number(tokenAmount) || 0),
    note: note || '',
    createdBy: req.user._id,
  });

  if (leadId) await Lead.findByIdAndUpdate(leadId, { stage: 'token_paid' });

  res.status(201).json({ success: true, data: { booking } });
});

/** PUT /api/bookings/:id (admin) — edit reservation details (not status). */
export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'moved_in') throw new ApiError(422, 'A moved-in booking cannot be edited');

  for (const f of ['name', 'phone', 'email', 'note']) {
    if (req.body[f] !== undefined) booking[f] = req.body[f];
  }
  if (req.body.moveInDate) booking.moveInDate = req.body.moveInDate;
  for (const f of ['rentAmount', 'securityDeposit', 'tokenAmount']) {
    if (req.body[f] !== undefined) booking[f] = Math.max(0, Number(req.body[f]) || 0);
  }
  await booking.save();
  res.json({ success: true, data: { booking } });
});

/** PUT /api/bookings/:id/status (admin) — advance the pipeline.
 *  moved_in provisions a tenant and fills the bed; cancelled releases the hold. */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!BOOKING_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'moved_in') throw new ApiError(409, 'This booking is already moved in');

  if (status === 'moved_in') {
    const tenant = await moveInTenant(booking);
    booking.tenantId = tenant._id;
    booking.status = 'moved_in';
    await booking.save();
    await notify(req.user._id, {
      title: 'Resident moved in',
      message: `${booking.name} moved into a room. Bed filled and tenant account created.`,
      type: 'general',
      link: '/admin/occupancy',
    });
    const populated = await booking.populate('roomId', 'roomNumber roomType');
    return res.json({ success: true, data: { booking: populated } });
  }

  booking.status = status;
  await booking.save();
  res.json({ success: true, data: { booking } });
});

/** DELETE /api/bookings/:id (admin) */
export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'moved_in') throw new ApiError(422, 'Cannot delete a moved-in booking');
  await booking.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
