import Room from '../models/Room.js';
import User from '../models/User.js';
import Booking, { HOLDING_STATUSES } from '../models/Booking.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * GET /api/occupancy (admin/staff)
 * Live occupancy board, derived from rooms + active tenants + holding bookings.
 * Returns per-floor room cards, headline KPIs, vacancies, and upcoming move-outs.
 * Revenue uses room.rentAmount as the per-bed rate.
 */
export const getOccupancy = asyncHandler(async (req, res) => {
  const [rooms, activeTenants, holds] = await Promise.all([
    Room.find().populate('assignedTenants', 'name tenantProfile.moveOutDate').sort({ floor: 1, roomNumber: 1 }),
    User.find({ role: 'tenant', isActive: true, 'tenantProfile.status': 'active', 'tenantProfile.roomId': { $ne: null } })
      .select('name tenantProfile.roomId tenantProfile.rentAmount tenantProfile.moveOutDate'),
    Booking.find({ status: { $in: HOLDING_STATUSES } }).select('name roomId moveInDate status'),
  ]);

  // Index holds by room.
  const holdsByRoom = new Map();
  for (const b of holds) {
    const k = String(b.roomId);
    if (!holdsByRoom.has(k)) holdsByRoom.set(k, []);
    holdsByRoom.get(k).push({ _id: b._id, name: b.name, moveInDate: b.moveInDate, status: b.status });
  }

  let totalBeds = 0;
  let occupiedBeds = 0;
  let reservedBeds = 0;
  let potentialRevenue = 0;
  let realizedRevenue = 0;
  let maintenanceRooms = 0;

  const floorMap = new Map();
  const vacancies = [];

  for (const room of rooms) {
    const occupants = (room.assignedTenants || []).map((t) => ({ _id: t._id, name: t.name }));
    const held = holdsByRoom.get(String(room._id)) || [];
    const occ = occupants.length;
    const isMaint = room.status === 'maintenance';
    if (isMaint) maintenanceRooms += 1;

    // Held beds can't exceed remaining capacity after occupants.
    const reserved = Math.min(held.length, Math.max(0, room.capacity - occ));
    const vacant = Math.max(0, room.capacity - occ - reserved);

    totalBeds += room.capacity;
    occupiedBeds += occ;
    reservedBeds += reserved;
    potentialRevenue += room.capacity * room.rentAmount;
    realizedRevenue += occ * room.rentAmount;

    const card = {
      _id: room._id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor,
      capacity: room.capacity,
      rentAmount: room.rentAmount,
      status: room.status,
      occupants,
      reserved: held.slice(0, reserved),
      occupiedBeds: occ,
      reservedBeds: reserved,
      vacantBeds: vacant,
    };

    if (!floorMap.has(room.floor)) floorMap.set(room.floor, []);
    floorMap.get(room.floor).push(card);

    if (vacant > 0 && !isMaint) {
      vacancies.push({ _id: room._id, roomNumber: room.roomNumber, roomType: room.roomType, floor: room.floor, vacantBeds: vacant, rentAmount: room.rentAmount });
    }
  }

  const floors = [...floorMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([floor, rms]) => ({ floor, rooms: rms }));

  // Upcoming move-outs — active tenants with a future move-out date.
  const now = new Date();
  const roomNumberById = new Map(rooms.map((r) => [String(r._id), r.roomNumber]));
  const upcomingMoveOuts = activeTenants
    .filter((t) => t.tenantProfile?.moveOutDate && new Date(t.tenantProfile.moveOutDate) >= now)
    .map((t) => ({
      tenantId: t._id,
      name: t.name,
      room: roomNumberById.get(String(t.tenantProfile.roomId)) || null,
      moveOutDate: t.tenantProfile.moveOutDate,
    }))
    .sort((a, b) => new Date(a.moveOutDate) - new Date(b.moveOutDate));

  const occupancyPct = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  res.json({
    success: true,
    data: {
      kpis: {
        rooms: rooms.length,
        totalBeds,
        occupiedBeds,
        reservedBeds,
        vacantBeds: Math.max(0, totalBeds - occupiedBeds - reservedBeds),
        occupancyPct,
        maintenanceRooms,
        potentialRevenue,
        realizedRevenue,
        leakage: Math.max(0, potentialRevenue - realizedRevenue),
        upcomingMoveOuts: upcomingMoveOuts.length,
      },
      floors,
      vacancies: vacancies.sort((a, b) => b.vacantBeds - a.vacantBeds),
      upcomingMoveOuts,
    },
  });
});
