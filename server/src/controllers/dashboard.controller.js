import User from '../models/User.js';
import Room from '../models/Room.js';
import Rent from '../models/Rent.js';
import Complaint from '../models/Complaint.js';
import Visitor from '../models/Visitor.js';
import Notice from '../models/Notice.js';
import FoodMenu from '../models/FoodMenu.js';
import Booking from '../models/Booking.js';
import Organization from '../models/Organization.js';
import { getSettings } from '../services/settings.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/** GET /api/dashboard/admin — every stat the admin dashboard needs in one call */
export const adminDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  // Keep overdue flags fresh so counts/alerts are accurate.
  await Rent.updateMany({ status: 'pending', dueDate: { $lt: now } }, { $set: { status: 'overdue' } });

  const [
    totalTenants, rooms, monthRents,
    openComplaints, inProgressComplaints, resolvedComplaints, highPriorityComplaints, totalComplaints,
    recentPayments, recentComplaints, complaintByCategory, revenueByMonth,
    visitorsToday, visitorsInside, visitorsPending,
    pendingRentList, recentNotices, foodAgg,
  ] = await Promise.all([
    User.countDocuments({ role: 'tenant', isActive: true, 'tenantProfile.status': 'active' }),
    Room.find({}, 'status capacity currentOccupancy'),
    Rent.find({ month, year }),
    Complaint.countDocuments({ status: { $in: ['pending', 'assigned', 'in_progress'] } }),
    Complaint.countDocuments({ status: 'in_progress' }),
    Complaint.countDocuments({ status: 'resolved' }),
    Complaint.countDocuments({ status: { $nin: ['resolved', 'rejected'] }, priority: { $in: ['high', 'urgent'] } }),
    Complaint.countDocuments({}),
    Rent.find({ status: 'paid' }).populate('tenantId', 'name').sort({ paidAt: -1 }).limit(5),
    Complaint.find().populate('tenantId', 'name').sort({ createdAt: -1 }).limit(5),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Rent.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: { month: '$month', year: '$year' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
    Visitor.countDocuments({ expectedDateTime: { $gte: startOfDay, $lte: endOfDay } }),
    Visitor.countDocuments({ status: 'checked_in' }),
    Visitor.countDocuments({ status: 'expected' }),
    Rent.find({ month, year, status: { $in: ['pending', 'overdue'] } })
      .populate('tenantId', 'name')
      .populate('roomId', 'roomNumber')
      .sort({ status: 1, totalAmount: -1 })
      .limit(6),
    Notice.find().sort({ isPinned: -1, createdAt: -1 }).limit(4).select('title category priority isPinned createdAt'),
    FoodMenu.aggregate([
      { $unwind: '$feedback' },
      { $group: { _id: null, avg: { $avg: '$feedback.rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const partialRooms = rooms.filter((r) => r.status === 'partially_occupied').length;
  const vacantRooms = rooms.filter((r) => r.status === 'vacant').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;
  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + r.currentOccupancy, 0);

  const paidRents = monthRents.filter((r) => r.status === 'paid');
  const unpaidRents = monthRents.filter((r) => r.status !== 'paid');
  const collected = paidRents.reduce((s, r) => s + r.totalAmount, 0);
  const pending = unpaidRents.reduce((s, r) => s + r.totalAmount, 0);
  const monthBilled = collected + pending;
  const overdueCount = monthRents.filter((r) => r.status === 'overdue').length;

  const avgFoodRating = foodAgg[0]?.avg ? Math.round(foodAgg[0].avg * 10) / 10 : null;
  const foodCount = foodAgg[0]?.count || 0;

  // ── PG Health Score — weighted blend of five operational signals (0–100) ──
  const occupancyPct = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const collectionPct = monthBilled > 0 ? Math.round((collected / monthBilled) * 100) : 100;
  const resolutionPct = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;
  const foodPct = avgFoodRating != null ? Math.round((avgFoodRating / 5) * 100) : 80;
  const safetyPct = visitorsInside === 0 ? 100 : Math.max(55, 100 - visitorsInside * 12);
  const healthBreakdown = [
    { key: 'Rent collection', pct: collectionPct, weight: 30 },
    { key: 'Occupancy', pct: occupancyPct, weight: 25 },
    { key: 'Complaint resolution', pct: resolutionPct, weight: 20 },
    { key: 'Food rating', pct: foodPct, weight: 15 },
    { key: 'Visitor safety', pct: safetyPct, weight: 10 },
  ];
  const healthScore = Math.round(healthBreakdown.reduce((s, b) => s + (b.pct * b.weight) / 100, 0));

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
        occupancyPct,
        monthCollection: collected,
        monthPending: pending,
        monthBilled,
        overdueCount,
        unpaidCount: unpaidRents.length,
        openComplaints,
        inProgressComplaints,
        resolvedComplaints,
        highPriorityComplaints,
        totalComplaints,
        visitorsToday,
        visitorsInside,
        visitorsPending,
        avgFoodRating,
        foodCount,
      },
      health: { score: healthScore, breakdown: healthBreakdown },
      pendingRent: pendingRentList.map((r) => ({
        _id: r._id,
        tenant: r.tenantId?.name || '—',
        room: r.roomId?.roomNumber || null,
        amount: r.totalAmount,
        status: r.status,
        dueDate: r.dueDate,
      })),
      recentNotices,
      recentPayments,
      recentComplaints,
      charts: {
        complaintByCategory: complaintByCategory.map((c) => ({ category: c._id, count: c.count })),
        revenueByMonth: revenueByMonth.map((r) => ({
          label: `${String(r._id.month).padStart(2, '0')}/${r._id.year}`,
          revenue: r.revenue,
        })),
        paidVsUnpaid: [
          { name: 'Paid', value: paidRents.length },
          { name: 'Unpaid', value: unpaidRents.length },
        ],
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

/** GET /api/dashboard/onboarding (admin) — real setup progress for a new org,
 *  computed from live counts so steps tick off as the admin does the work. */
export const onboarding = asyncHandler(async (req, res) => {
  const [rooms, residents, staff, anyRent, org, settings] = await Promise.all([
    Room.countDocuments({}),
    User.countDocuments({ role: 'tenant' }),
    User.countDocuments({ role: 'staff' }),
    Rent.countDocuments({}),
    Organization.findById(req.user.orgId).select('onboardingDismissed').lean(),
    getSettings(),
  ]);

  const businessSet = !!(settings?.business?.name && settings.business.name !== 'Quarters')
    || !!settings?.business?.address || !!settings?.payments?.upiVpa;

  const steps = [
    { key: 'rooms', title: 'Add your first room', done: rooms > 0, to: '/admin/rooms', cta: 'Add a room' },
    { key: 'residents', title: 'Add a resident', done: residents > 0, to: '/admin/tenants', cta: 'Add a resident' },
    { key: 'business', title: 'Set your business details & UPI', done: businessSet, to: '/admin/settings', cta: 'Open settings' },
    { key: 'rent', title: 'Generate the first rent invoice', done: anyRent > 0, to: '/admin/rents', cta: 'Go to rent' },
    { key: 'staff', title: 'Invite a staff member', done: staff > 0, to: '/admin/staff', cta: 'Add staff' },
  ];
  const completed = steps.filter((s) => s.done).length;
  res.json({
    success: true,
    data: {
      steps,
      completed,
      total: steps.length,
      percent: Math.round((completed / steps.length) * 100),
      dismissed: !!org?.onboardingDismissed,
    },
  });
});

/** POST /api/dashboard/onboarding/dismiss (admin) — hide the checklist. */
export const dismissOnboarding = asyncHandler(async (req, res) => {
  await Organization.findByIdAndUpdate(req.user.orgId, { onboardingDismissed: true });
  res.json({ success: true });
});

/** GET /api/dashboard/activity (admin) — a merged, org-scoped feed of recent
 *  events derived from existing timestamps (no separate audit collection). */
export const activity = asyncHandler(async (req, res) => {
  const [tenants, rooms, rentsPaid, complaints, bookings, notices] = await Promise.all([
    User.find({ role: 'tenant' }).sort({ createdAt: -1 }).limit(6).select('name createdAt').lean(),
    Room.find({}).sort({ createdAt: -1 }).limit(6).select('roomNumber createdAt').lean(),
    Rent.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(6).populate('tenantId', 'name').lean(),
    Complaint.find({}).sort({ createdAt: -1 }).limit(6).populate('tenantId', 'name').select('title status tenantId createdAt resolvedAt').lean(),
    Booking.find({}).sort({ createdAt: -1 }).limit(6).select('name status createdAt').lean(),
    Notice.find({}).sort({ createdAt: -1 }).limit(4).select('title createdAt').lean(),
  ]);

  const items = [
    ...tenants.map((t) => ({ type: 'resident', icon: 'user', text: `${t.name} was added as a resident`, at: t.createdAt })),
    ...rooms.map((r) => ({ type: 'room', icon: 'door', text: `Room ${r.roomNumber} was added`, at: r.createdAt })),
    ...rentsPaid.map((r) => ({ type: 'payment', icon: 'rupee', text: `${r.tenantId?.name || 'A resident'} paid rent`, at: r.paidAt })),
    ...complaints.map((c) => ({
      type: 'complaint', icon: c.status === 'resolved' ? 'check' : 'wrench',
      text: c.status === 'resolved' ? `Complaint “${c.title}” resolved` : `${c.tenantId?.name || 'A resident'} raised “${c.title}”`,
      at: c.status === 'resolved' ? (c.resolvedAt || c.createdAt) : c.createdAt,
    })),
    ...bookings.map((b) => ({ type: 'booking', icon: 'calendar', text: `Booking for ${b.name || 'a guest'} (${b.status})`, at: b.createdAt })),
    ...notices.map((n) => ({ type: 'notice', icon: 'megaphone', text: `Notice posted: “${n.title}”`, at: n.createdAt })),
  ]
    .filter((i) => i.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 15);

  res.json({ success: true, data: { items } });
});
