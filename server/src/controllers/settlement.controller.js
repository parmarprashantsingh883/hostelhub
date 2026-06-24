import DepositLedger from '../models/DepositLedger.js';
import User from '../models/User.js';
import Rent from '../models/Rent.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { generateSettlement } from '../services/settlement.service.js';

/** Load (or lazily create) a tenant's ledger, seeding the held deposit from
 *  the tenant's recorded securityDeposit on first touch. */
async function getOrCreateLedger(tenantId) {
  const tenant = await User.findOne({ _id: tenantId, role: 'tenant' });
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  let ledger = await DepositLedger.findOne({ tenantId });
  if (!ledger) {
    const seed = Number(tenant.tenantProfile?.securityDeposit || 0);
    ledger = await DepositLedger.create({
      tenantId,
      entries: seed > 0 ? [{ type: 'deposit', amount: seed, reason: 'Opening security deposit', at: new Date() }] : [],
    });
  }
  return { ledger, tenant };
}

/** Sum of a tenant's unpaid rent (pending + overdue) totalAmount. */
async function pendingDuesFor(tenantId) {
  const unpaid = await Rent.find({ tenantId, status: { $in: ['pending', 'overdue'] } }).select('totalAmount');
  return unpaid.reduce((s, r) => s + (r.totalAmount || 0), 0);
}

/** Compute the settlement maths for a tenant. */
async function computeFor(tenantId) {
  const { ledger, tenant } = await getOrCreateLedger(tenantId);
  const pendingDues = await pendingDuesFor(tenantId);
  // Gross deposit collected (sum of deposit credits) — the statement shows this
  // in full, then subtracts dues and deductions to reach the refund. Using the
  // net `depositHeld` virtual here would double-count deductions.
  const depositHeld = (ledger.entries || [])
    .filter((e) => e.type === 'deposit')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalDeductions = ledger.totalDeductions;
  const refund = depositHeld - pendingDues - totalDeductions;
  const deductions = ledger.entries
    .filter((e) => e.type === 'deduction')
    .map((e) => ({ _id: e._id, amount: e.amount, reason: e.reason, at: e.at }));
  return { ledger, tenant, pendingDues, depositHeld, totalDeductions, deductions, refund };
}

/** GET /api/settlements/queue — tenants who are moved_out or inactive (move-out queue). */
export const moveOutQueue = asyncHandler(async (_req, res) => {
  const tenants = await User.find({
    role: 'tenant',
    'tenantProfile.status': { $in: ['moved_out', 'inactive'] },
  })
    .populate('tenantProfile.roomId', 'roomNumber floor roomType')
    .sort({ 'tenantProfile.moveOutDate': -1, updatedAt: -1 })
    .select('name email phone tenantProfile');

  const ledgers = await DepositLedger.find({ tenantId: { $in: tenants.map((t) => t._id) } });
  const settledMap = new Map(ledgers.map((l) => [String(l.tenantId), { settledAt: l.settledAt, settlementUrl: l.settlementUrl }]));

  const queue = tenants.map((t) => ({
    _id: t._id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    status: t.tenantProfile?.status,
    moveOutDate: t.tenantProfile?.moveOutDate || null,
    room: t.tenantProfile?.roomId || null,
    settledAt: settledMap.get(String(t._id))?.settledAt || null,
    settlementUrl: settledMap.get(String(t._id))?.settlementUrl || null,
  }));

  res.json({ success: true, data: { queue } });
});

/** GET /api/settlements/:tenantId — ledger + computed settlement for a tenant. */
export const getLedger = asyncHandler(async (req, res) => {
  const { ledger, tenant, pendingDues, depositHeld, totalDeductions, deductions, refund } =
    await computeFor(req.params.tenantId);

  res.json({
    success: true,
    data: {
      tenant: { _id: tenant._id, name: tenant.name, email: tenant.email, phone: tenant.phone, tenantProfile: tenant.tenantProfile },
      ledger: {
        _id: ledger._id,
        entries: ledger.entries,
        settledAt: ledger.settledAt,
        settlementUrl: ledger.settlementUrl,
      },
      settlement: { depositHeld, pendingDues, totalDeductions, deductions, refund },
    },
  });
});

/** POST /api/settlements/:tenantId/deductions  { amount, reason } — add a deduction. */
export const addDeduction = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  const { ledger } = await getOrCreateLedger(req.params.tenantId);

  if (ledger.settledAt) throw new ApiError(422, 'Settlement is already finalised — cannot add deductions');

  ledger.entries.push({ type: 'deduction', amount, reason: reason || '', at: new Date() });
  await ledger.save();

  const computed = await computeFor(req.params.tenantId);
  res.status(201).json({
    success: true,
    data: {
      ledger: { _id: ledger._id, entries: ledger.entries, settledAt: ledger.settledAt, settlementUrl: ledger.settlementUrl },
      settlement: {
        depositHeld: computed.depositHeld,
        pendingDues: computed.pendingDues,
        totalDeductions: computed.totalDeductions,
        deductions: computed.deductions,
        refund: computed.refund,
      },
    },
  });
});

/** GET /api/settlements/:tenantId/compute — just the settlement maths. */
export const computeSettlement = asyncHandler(async (req, res) => {
  const { depositHeld, pendingDues, totalDeductions, deductions, refund } = await computeFor(req.params.tenantId);
  res.json({ success: true, data: { settlement: { depositHeld, pendingDues, totalDeductions, deductions, refund } } });
});

/** POST /api/settlements/:tenantId/finalize — record the refund and emit a PDF. */
export const finalizeSettlement = asyncHandler(async (req, res) => {
  const { ledger, tenant, pendingDues, depositHeld, totalDeductions, deductions, refund } =
    await computeFor(req.params.tenantId);

  if (ledger.settledAt) throw new ApiError(422, 'Settlement is already finalised — ledger is closed');

  await tenant.populate('tenantProfile.roomId', 'roomNumber floor roomType');
  const room = tenant.tenantProfile?.roomId || null;

  const settlementUrl = await generateSettlement({
    tenant,
    room: room && room.roomNumber ? room : null,
    depositHeld,
    pendingDues,
    deductions,
    totalDeductions,
    refund,
  });

  // Record the refund/recovery as a closing entry so the ledger nets to the
  // dues + deductions already booked. Only the deposit portion returned to the
  // tenant is logged as a refund entry (never negative).
  if (refund > 0) {
    ledger.entries.push({ type: 'refund', amount: refund, reason: 'Move-out settlement refund', at: new Date() });
  }
  ledger.settledAt = new Date();
  ledger.settlementUrl = settlementUrl;
  await ledger.save();

  res.json({
    success: true,
    data: {
      settlementUrl,
      settlement: { depositHeld, pendingDues, totalDeductions, refund },
      ledger: { _id: ledger._id, entries: ledger.entries, settledAt: ledger.settledAt, settlementUrl: ledger.settlementUrl },
    },
  });
});
