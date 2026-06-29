import User from '../models/User.js';
import Attendance, { ATTENDANCE_STATUS, SHIFTS } from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import Expense from '../models/Expense.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const period = (q) => {
  const now = new Date();
  return { month: Number(q.month) || now.getMonth() + 1, year: Number(q.year) || now.getFullYear() };
};
const monthRange = (m, y) => ({ start: new Date(y, m - 1, 1), end: new Date(y, m, 1) });
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const activeStaff = () => User.find({ role: 'staff', isActive: { $ne: false }, 'staffProfile.status': 'active' }).select('name staffProfile');

/** GET /api/attendance?month=&year=&date=&staffId= (admin) */
export const listAttendance = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.date) {
    const d = startOfDay(req.query.date);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    q.date = { $gte: d, $lt: next };
  } else {
    const { month, year } = period(req.query);
    const { start, end } = monthRange(month, year);
    q.date = { $gte: start, $lt: end };
  }
  if (req.query.staffId) q.staffId = req.query.staffId;
  const records = await Attendance.find(q).populate('staffId', 'name staffProfile').sort({ date: -1 });
  res.json({ success: true, data: { records } });
});

/** POST /api/attendance { staffId, date, status, shift, note } (admin) — upsert one day. */
export const markAttendance = asyncHandler(async (req, res) => {
  const { staffId, status = 'present', shift = 'general', note = '' } = req.body;
  if (!ATTENDANCE_STATUS.includes(status)) throw new ApiError(400, 'Invalid status');
  if (!SHIFTS.includes(shift)) throw new ApiError(400, 'Invalid shift');
  const staff = await User.findOne({ _id: staffId, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');

  const day = startOfDay(req.body.date || new Date());
  const record = await Attendance.findOneAndUpdate(
    { staffId, date: day },
    { status, shift, note, markedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, data: { record } });
});

/** GET /api/attendance/summary?month=&year= (admin) — per-staff counts for the month. */
export const attendanceSummary = asyncHandler(async (req, res) => {
  const { month, year } = period(req.query);
  const { start, end } = monthRange(month, year);
  const [staff, recs] = await Promise.all([
    activeStaff(),
    Attendance.find({ date: { $gte: start, $lt: end } }),
  ]);
  const byStaff = new Map();
  recs.forEach((r) => {
    const k = String(r.staffId);
    if (!byStaff.has(k)) byStaff.set(k, { present: 0, absent: 0, half_day: 0, leave: 0 });
    byStaff.get(k)[r.status] += 1;
  });
  const summary = staff.map((s) => {
    const c = byStaff.get(String(s._id)) || { present: 0, absent: 0, half_day: 0, leave: 0 };
    return {
      staff: { _id: s._id, name: s.name, staffType: s.staffProfile?.staffType, salary: s.staffProfile?.salary || 0 },
      ...c,
      marked: c.present + c.absent + c.half_day + c.leave,
    };
  });
  res.json({ success: true, data: { month, year, summary } });
});

/** GET /api/payroll?month=&year= (admin) — salary status per staff for the month. */
export const listPayroll = asyncHandler(async (req, res) => {
  const { month, year } = period(req.query);
  const { start, end } = monthRange(month, year);
  const [staff, paid, recs] = await Promise.all([
    activeStaff(),
    Payroll.find({ month, year }),
    Attendance.find({ date: { $gte: start, $lt: end }, status: { $in: ['present', 'half_day'] } }),
  ]);
  const paidMap = new Map(paid.map((p) => [String(p.staffId), p]));
  const presentMap = new Map();
  recs.forEach((r) => {
    const k = String(r.staffId);
    presentMap.set(k, (presentMap.get(k) || 0) + (r.status === 'half_day' ? 0.5 : 1));
  });
  const rows = staff.map((s) => {
    const p = paidMap.get(String(s._id));
    return {
      staff: { _id: s._id, name: s.name, staffType: s.staffProfile?.staffType, salary: s.staffProfile?.salary || 0 },
      presentDays: presentMap.get(String(s._id)) || 0,
      payroll: p ? { amount: p.amount, paidAt: p.paidAt } : null,
    };
  });
  const totalSalary = staff.reduce((sum, s) => sum + (s.staffProfile?.salary || 0), 0);
  const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);
  res.json({ success: true, data: { month, year, rows, totalSalary, paidTotal } });
});

/** POST /api/payroll/run { staffId, month, year, amount? } (admin) — pay salary → logs an expense. */
export const runPayroll = asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  const { month, year } = period(req.body);
  const staff = await User.findOne({ _id: staffId, role: 'staff' });
  if (!staff) throw new ApiError(404, 'Staff member not found');

  const existing = await Payroll.findOne({ staffId, month, year });
  if (existing) throw new ApiError(409, 'Salary already paid for this period');

  const amount = req.body.amount != null ? Math.max(0, Number(req.body.amount)) : Number(staff.staffProfile?.salary || 0);
  if (amount <= 0) throw new ApiError(422, 'No salary amount set for this staff member');

  const expense = await Expense.create({
    category: 'salaries',
    amount,
    date: new Date(),
    vendor: staff.name,
    note: `Salary ${MONTHS[month - 1]} ${year} — ${staff.name}`,
    createdBy: req.user._id,
  });
  const payroll = await Payroll.create({ staffId, month, year, amount, paidAt: new Date(), expenseId: expense._id, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { payroll } });
});
