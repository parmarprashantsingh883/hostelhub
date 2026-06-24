import Rent from '../models/Rent.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { createOrder, verifySignature, paymentMode } from '../services/payment.service.js';
import { generateReceipt } from '../services/receipt.service.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';
import { notify } from '../services/notification.service.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthLabel = (m, y) => `${MONTHS[m - 1]} ${y}`;

/** POST /api/rents/generate { month, year, dueDay } (admin)
 *  Creates a rent record for every ACTIVE tenant with a room. Skips existing. */
export const generateRents = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = Number(req.body.month) || now.getMonth() + 1;
  const year = Number(req.body.year) || now.getFullYear();
  const dueDay = Number(req.body.dueDay) || 5;

  const tenants = await User.find({
    role: 'tenant',
    isActive: true,
    'tenantProfile.status': 'active',
    'tenantProfile.roomId': { $ne: null },
  });

  let created = 0;
  let skipped = 0;
  for (const t of tenants) {
    const exists = await Rent.findOne({ tenantId: t._id, month, year });
    if (exists) {
      skipped++;
      continue;
    }
    await Rent.create({
      tenantId: t._id,
      roomId: t.tenantProfile.roomId,
      month,
      year,
      rentAmount: t.tenantProfile.rentAmount || 0,
      totalAmount: t.tenantProfile.rentAmount || 0,
      dueDate: new Date(year, month - 1, dueDay),
    });
    created++;
    await notify(t._id, {
      title: 'Rent generated',
      message: `Your rent for ${monthLabel(month, year)} is ready. Due by ${dueDay}/${month}/${year}.`,
      type: 'rent_due',
      link: '/tenant/rent',
    });
  }

  res.json({ success: true, data: { created, skipped, month, year } });
});

/** GET /api/rents?status=&month=&year=&tenantId=&page=&limit= */
export const listRents = asyncHandler(async (req, res) => {
  const { status, month, year, tenantId, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (month) q.month = Number(month);
  if (year) q.year = Number(year);
  if (tenantId) q.tenantId = tenantId;
  // Tenants only see their own rent
  if (req.user.role === 'tenant') q.tenantId = req.user._id;

  // Auto-flag overdue
  await Rent.updateMany(
    { status: 'pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } },
  );

  const [rents, total] = await Promise.all([
    Rent.find(q)
      .populate('tenantId', 'name email phone')
      .populate('roomId', 'roomNumber floor')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Rent.countDocuments(q),
  ]);

  res.json({ success: true, data: { rents, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/rents/:id */
export const getRent = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id)
    .populate('tenantId', 'name email phone')
    .populate('roomId', 'roomNumber floor roomType');
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (req.user.role === 'tenant' && String(rent.tenantId._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your rent record');
  }
  res.json({ success: true, data: { rent } });
});

/** PUT /api/rents/:id  { lateFee, discount } (admin) — adjust amounts */
export const updateRent = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id);
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (rent.status === 'paid') throw new ApiError(422, 'Cannot adjust a paid rent');

  if (req.body.lateFee !== undefined) rent.lateFee = Math.max(0, Number(req.body.lateFee));
  if (req.body.discount !== undefined) rent.discount = Math.max(0, Number(req.body.discount));
  await rent.save();
  res.json({ success: true, data: { rent } });
});

/** PUT /api/rents/:id/mark-paid { method, transactionId } (admin) */
export const markPaid = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id).populate('tenantId').populate('roomId');
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (rent.status === 'paid') throw new ApiError(409, 'Already paid');

  rent.status = 'paid';
  rent.paymentMethod = req.body.method || 'cash';
  rent.transactionId = req.body.transactionId || `MANUAL-${Date.now()}`;
  rent.paidAt = new Date();
  rent.receiptUrl = await generateReceipt({ rent, tenant: rent.tenantId, room: rent.roomId });
  await rent.save();

  await Payment.create({
    rentId: rent._id,
    tenantId: rent.tenantId._id,
    amount: rent.totalAmount,
    method: rent.paymentMethod,
    status: 'success',
  });

  await notify(rent.tenantId._id, {
    title: 'Payment recorded',
    message: `Your rent for ${monthLabel(rent.month, rent.year)} was marked paid (₹${rent.totalAmount}).`,
    type: 'payment',
    link: '/tenant/rent',
  });

  res.json({ success: true, data: { rent } });
});

/** POST /api/rents/:id/pay — tenant initiates online payment, returns order */
export const initiatePayment = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id);
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (String(rent.tenantId) !== String(req.user._id)) throw new ApiError(403, 'Not your rent record');
  if (rent.status === 'paid') throw new ApiError(409, 'Already paid');

  const { mode, keyId, order } = await createOrder({
    amountInRupees: rent.totalAmount,
    receiptId: String(rent._id),
  });

  await Payment.create({
    rentId: rent._id,
    tenantId: req.user._id,
    amount: rent.totalAmount,
    method: 'razorpay',
    gatewayOrderId: order.id,
    status: 'created',
  });

  res.json({ success: true, data: { mode, keyId, order } });
});

/** POST /api/rents/:id/verify — payment callback verification */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const rent = await Rent.findById(req.params.id).populate('tenantId').populate('roomId');
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (String(rent.tenantId._id) !== String(req.user._id)) throw new ApiError(403, 'Not your rent record');

  const payment = await Payment.findOne({ rentId: rent._id, gatewayOrderId: orderId });
  if (!payment) throw new ApiError(404, 'Payment order not found');

  const valid = verifySignature({ orderId, paymentId, signature });
  if (!valid) {
    payment.status = 'failed';
    payment.failureReason = 'Signature verification failed';
    await payment.save();
    throw new ApiError(400, 'Payment verification failed');
  }

  payment.status = 'success';
  payment.gatewayPaymentId = paymentId;
  payment.gatewaySignature = signature || null;
  await payment.save();

  rent.status = 'paid';
  rent.paymentMethod = 'razorpay';
  rent.transactionId = paymentId;
  rent.paidAt = new Date();
  rent.receiptUrl = await generateReceipt({ rent, tenant: rent.tenantId, room: rent.roomId });
  await rent.save();

  const label = monthLabel(rent.month, rent.year);
  const tpl = emailTemplates.paymentReceipt(rent.tenantId.name, label, rent.totalAmount, paymentId);
  await sendEmail({ to: rent.tenantId.email, ...tpl });
  await notify(rent.tenantId._id, {
    title: 'Payment successful 🎉',
    message: `₹${rent.totalAmount} received for ${label}. Receipt is ready.`,
    type: 'payment',
    link: '/tenant/rent',
  });

  res.json({ success: true, data: { rent, paymentMode: paymentMode() } });
});

/** GET /api/rents/:id/receipt — download URL */
export const getReceipt = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id);
  if (!rent) throw new ApiError(404, 'Rent record not found');
  if (req.user.role === 'tenant' && String(rent.tenantId) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your rent record');
  }
  if (!rent.receiptUrl) throw new ApiError(404, 'Receipt not generated yet — rent may be unpaid');
  res.json({ success: true, data: { receiptUrl: rent.receiptUrl } });
});

/** POST /api/rents/send-reminders (admin) — email + notify all pending/overdue */
export const sendReminders = asyncHandler(async (req, res) => {
  const { rentIds } = req.body || {};
  const query = { status: { $in: ['pending', 'overdue'] } };
  if (Array.isArray(rentIds) && rentIds.length) query._id = { $in: rentIds };
  const rents = await Rent.find(query).populate('tenantId', 'name email');
  let sent = 0;
  for (const rent of rents) {
    if (!rent.tenantId) continue;
    const label = monthLabel(rent.month, rent.year);
    const tpl = emailTemplates.rentReminder(
      rent.tenantId.name,
      label,
      rent.totalAmount,
      rent.dueDate.toLocaleDateString('en-IN'),
    );
    await sendEmail({ to: rent.tenantId.email, ...tpl });
    await notify(rent.tenantId._id, {
      title: 'Rent reminder',
      message: `₹${rent.totalAmount} for ${label} is ${rent.status}. Please pay soon.`,
      type: 'rent_due',
      link: '/tenant/rent',
    });
    sent++;
  }
  res.json({ success: true, data: { remindersSent: sent } });
});
