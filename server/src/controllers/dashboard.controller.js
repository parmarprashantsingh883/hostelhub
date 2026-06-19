import User from '../models/User.js';
import Room from '../models/Room.js';
import Rent from '../models/Rent.js';
import Complaint from '../models/Complaint.js';
import Visitor from '../models/Visitor.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/** GET /api/dashboard/admin — every stat the admin dashboard needs in one call */
export const adminDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [
    totalTenants,
    rooms,
    monthRents,
    openComplaints,
    resolvedComplaints,
    recentPayments,
    recentComplaints,
    complaintByCategory,
    revenueByMonth,
  ] = await Promise.all([
    User.countDocuments({ role: 'tenant', isActive: true, 'tenantProfile.status': 'active' }),
    Room.find({}, 'status capacity currentOccupancy'),
    Rent.find({ month, year }),
    Complaint.countDocuments({ status: { $in: ['pending', 'assigned', 'in_progress'] } }),
    Complaint.countDocuments({ status: 'resolved' }),
    Rent.find({ status: 'paid' })
      .populate('tenantId', 'name')
      .sort({ paidAt: -1 })
      .limit(5),
    Complaint.find()
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Rent.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ]);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const partialRooms = rooms.filter((r) => r.status === 'partially_occupied').length;
  const vacantRooms = rooms.filter((r) => r.status === 'vacant').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;
  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + r.currentOccupancy, 0);

  const collected = monthRents.filter((r) => r.status === 'paid').reduce((s, r) => s + r.totalAmount, 0);
  const pending = monthRents
    .filter((r) => r.status !== 'paid')
    .reduce((s, r) => s + r.totalAmount, 0);

  res.json({
    success: true,
    data: {
      stats: {
        totalTenants,
        totalRooms,
        occupiedRooms,
        partialRooms,
        vacantRooms,
        maintenanceRooms,
        totalBeds,
        occupiedBeds,
        occupancyPct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        monthCollection: collected,
        monthPending: pending,
        openComplaints,
        resolvedComplaints,
      },
      recentPayments,
      recentComplaints,
      charts: {
        complaintByCategory: complaintByCategory.map((c) => ({ category: c._id, count: c.count })),
        revenueByMonth: revenueByMonth.map((r) => ({
          label: `${String(r._id.month).padStart(2, '0')}/${r._id.year}`,
          revenue: r.revenue,
        })),
        occupancy: [
          { name: 'Occupied', value: occupiedRooms },
          { name: 'Partial', value: partialRooms },
          { name: 'Vacant', value: vacantRooms },
          { name: 'Maintenance', value: maintenanceRooms },
        ],
      },
    },
  });
});

/** GET /api/dashboard/tenant */
export const tenantDashboard = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user._id).populate(
    'tenantProfile.roomId',
    'roomNumber floor roomType rentAmount facilities',
  );
  const [rents, complaints, visitors] = await Promise.all([
    Rent.find({ tenantId: req.user._id }).sort({ year: -1, month: -1 }).limit(6),
    Complaint.find({ tenantId: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Visitor.find({ tenantId: req.user._id, status: 'expected' }).sort({ expectedDateTime: 1 }).limit(3),
  ]);

  const due = rents.find((r) => r.status !== 'paid');

  res.json({
    success: true,
    data: {
      profile: me,
      room: me.tenantProfile?.roomId || null,
      dueRent: due || null,
      recentRents: rents,
      recentComplaints: complaints,
      upcomingVisitors: visitors,
    },
  });
});

/** GET /api/dashboard/staff */
export const staffDashboard = asyncHandler(async (req, res) => {
  const [assigned, inProgress, resolvedToday, expectedVisitors] = await Promise.all([
    Complaint.countDocuments({ assignedStaffId: req.user._id, status: 'assigned' }),
    Complaint.countDocuments({ assignedStaffId: req.user._id, status: 'in_progress' }),
    Complaint.countDocuments({
      assignedStaffId: req.user._id,
      status: 'resolved',
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Visitor.countDocuments({ status: 'expected' }),
  ]);

  const tasks = await Complaint.find({
    assignedStaffId: req.user._id,
    status: { $in: ['assigned', 'in_progress'] },
  })
    .populate('tenantId', 'name phone')
    .populate('roomId', 'roomNumber floor')
    .sort({ priority: -1, createdAt: 1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      stats: { assigned, inProgress, resolvedToday, expectedVisitors },
      tasks,
    },
  });
});
