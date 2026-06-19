import Rent from '../models/Rent.js';
import Room from '../models/Room.js';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const dateRange = (req) => {
  const q = {};
  if (req.query.from) q.$gte = new Date(req.query.from);
  if (req.query.to) q.$lte = new Date(req.query.to);
  return Object.keys(q).length ? q : null;
};

/** CSV helper — returns text/csv when ?format=csv, JSON otherwise */
function respond(res, req, rows, filename) {
  if (req.query.format === 'csv') {
    if (!rows.length) return res.status(200).type('text/csv').send('');
    const headers = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
    res.type('text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
  res.json({ success: true, data: { rows } });
}

/** GET /api/reports/revenue?from=&to=&format=csv */
export const revenueReport = asyncHandler(async (req, res) => {
  const match = { status: 'paid' };
  const range = dateRange(req);
  if (range) match.paidAt = range;

  const rents = await Rent.find(match)
    .populate('tenantId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ paidAt: -1 });

  const rows = rents.map((r) => ({
    tenant: r.tenantId?.name || '-',
    room: r.roomId?.roomNumber || '-',
    month: `${r.month}/${r.year}`,
    rentAmount: r.rentAmount,
    lateFee: r.lateFee,
    discount: r.discount,
    totalPaid: r.totalAmount,
    method: r.paymentMethod,
    paidAt: r.paidAt?.toISOString().slice(0, 10),
  }));
  respond(res, req, rows, 'revenue-report');
});

/** GET /api/reports/pending-rent */
export const pendingRentReport = asyncHandler(async (req, res) => {
  const rents = await Rent.find({ status: { $in: ['pending', 'overdue'] } })
    .populate('tenantId', 'name phone email')
    .populate('roomId', 'roomNumber')
    .sort({ dueDate: 1 });

  const rows = rents.map((r) => ({
    tenant: r.tenantId?.name || '-',
    phone: r.tenantId?.phone || '-',
    room: r.roomId?.roomNumber || '-',
    month: `${r.month}/${r.year}`,
    amountDue: r.totalAmount,
    dueDate: r.dueDate?.toISOString().slice(0, 10),
    status: r.status,
  }));
  respond(res, req, rows, 'pending-rent-report');
});

/** GET /api/reports/occupancy */
export const occupancyReport = asyncHandler(async (req, res) => {
  const rooms = await Room.find().populate('assignedTenants', 'name').sort({ floor: 1, roomNumber: 1 });
  const rows = rooms.map((r) => ({
    room: r.roomNumber,
    floor: r.floor,
    type: r.roomType,
    capacity: r.capacity,
    occupied: r.currentOccupancy,
    status: r.status,
    rent: r.rentAmount,
    tenants: r.assignedTenants.map((t) => t.name).join(' | '),
  }));
  respond(res, req, rows, 'occupancy-report');
});

/** GET /api/reports/complaints?from=&to= */
export const complaintReport = asyncHandler(async (req, res) => {
  const match = {};
  const range = dateRange(req);
  if (range) match.createdAt = range;

  const complaints = await Complaint.find(match)
    .populate('tenantId', 'name')
    .populate('assignedStaffId', 'name')
    .sort({ createdAt: -1 });

  const rows = complaints.map((c) => ({
    title: c.title,
    category: c.category,
    priority: c.priority,
    status: c.status,
    tenant: c.tenantId?.name || '-',
    assignedTo: c.assignedStaffId?.name || '-',
    rating: c.rating ?? '-',
    createdAt: c.createdAt.toISOString().slice(0, 10),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString().slice(0, 10) : '-',
  }));
  respond(res, req, rows, 'complaint-report');
});

/** GET /api/reports/staff-tasks */
export const staffTaskReport = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: 'staff' });
  const rows = [];
  for (const s of staff) {
    const [assigned, inProgress, resolved] = await Promise.all([
      Complaint.countDocuments({ assignedStaffId: s._id, status: 'assigned' }),
      Complaint.countDocuments({ assignedStaffId: s._id, status: 'in_progress' }),
      Complaint.countDocuments({ assignedStaffId: s._id, status: 'resolved' }),
    ]);
    rows.push({
      staff: s.name,
      type: s.staffProfile?.staffType || '-',
      status: s.staffProfile?.status || '-',
      assigned,
      inProgress,
      resolved,
    });
  }
  respond(res, req, rows, 'staff-task-report');
});
