import Inspection, { INSPECTION_TYPES, DEFAULT_CHECKLIST } from '../models/Inspection.js';
import User from '../models/User.js';
import DepositLedger from '../models/DepositLedger.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

const populate = (q) => q
  .populate('tenantId', 'name email')
  .populate('roomId', 'roomNumber floor')
  .populate('inspectedBy', 'name');

/** GET /api/inspections?tenantId=&type=&status= (admin/staff) */
export const listInspections = asyncHandler(async (req, res) => {
  const { tenantId, type, status } = req.query;
  const q = {};
  if (tenantId) q.tenantId = tenantId;
  if (type) q.type = type;
  if (status) q.status = status;
  const inspections = await populate(Inspection.find(q)).sort({ createdAt: -1 });
  res.json({ success: true, data: { inspections } });
});

/** GET /api/inspections/:id (admin/staff) */
export const getInspection = asyncHandler(async (req, res) => {
  const inspection = await populate(Inspection.findById(req.params.id));
  if (!inspection) throw new ApiError(404, 'Inspection not found');
  res.json({ success: true, data: { inspection } });
});

/** POST /api/inspections { type, tenantId, roomId?, items? } (admin/staff)
 *  Room defaults to the tenant's room; items default to the standard checklist. */
export const createInspection = asyncHandler(async (req, res) => {
  const { type, tenantId } = req.body;
  if (!INSPECTION_TYPES.includes(type)) throw new ApiError(400, 'type must be move_in or move_out');
  const tenant = await User.findOne({ _id: tenantId, role: 'tenant' });
  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const items = Array.isArray(req.body.items) && req.body.items.length
    ? req.body.items.map((i) => ({ label: i.label, condition: i.condition || 'good', note: i.note || '', deduction: Math.max(0, Number(i.deduction) || 0) }))
    : DEFAULT_CHECKLIST.map((label) => ({ label, condition: 'good', note: '', deduction: 0 }));

  const inspection = await Inspection.create({
    type,
    tenantId,
    roomId: req.body.roomId || tenant.tenantProfile?.roomId || null,
    items,
    inspectedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { inspection: await populate(Inspection.findById(inspection._id)) } });
});

/** PUT /api/inspections/:id { items, overallNote } (admin/staff) — edit a draft. */
export const updateInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new ApiError(404, 'Inspection not found');
  if (inspection.status === 'completed') throw new ApiError(422, 'A completed inspection cannot be edited');

  if (Array.isArray(req.body.items)) {
    inspection.items = req.body.items.map((i) => ({
      label: i.label,
      condition: i.condition || 'good',
      note: i.note || '',
      deduction: Math.max(0, Number(i.deduction) || 0),
    }));
  }
  if (req.body.overallNote !== undefined) inspection.overallNote = req.body.overallNote;
  await inspection.save();
  res.json({ success: true, data: { inspection: await populate(Inspection.findById(inspection._id)) } });
});

/** PUT /api/inspections/:id/complete (admin/staff)
 *  Finalises the report. For move-out, posts each item's deduction to the
 *  tenant's deposit ledger (once) so it flows into the settlement refund. */
export const completeInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new ApiError(404, 'Inspection not found');
  if (inspection.status === 'completed') throw new ApiError(409, 'Already completed');

  let postedToLedger = false;
  let ledgerClosed = false;

  if (inspection.type === 'move_out') {
    const charges = inspection.items.filter((i) => i.deduction > 0);
    if (charges.length) {
      const tenant = await User.findById(inspection.tenantId);
      let ledger = await DepositLedger.findOne({ tenantId: inspection.tenantId });
      if (!ledger) {
        const seed = Number(tenant?.tenantProfile?.securityDeposit || 0);
        ledger = await DepositLedger.create({
          tenantId: inspection.tenantId,
          entries: seed > 0 ? [{ type: 'deposit', amount: seed, reason: 'Opening security deposit', at: new Date() }] : [],
        });
      }
      if (ledger.settledAt) {
        ledgerClosed = true; // settlement already finalised — don't post
      } else {
        charges.forEach((i) => {
          ledger.entries.push({ type: 'deduction', amount: i.deduction, reason: `Move-out: ${i.label} (${i.condition})`, at: new Date() });
        });
        await ledger.save();
        postedToLedger = true;
      }
    }
  }

  inspection.status = 'completed';
  inspection.completedAt = new Date();
  inspection.postedToLedger = postedToLedger;
  await inspection.save();

  res.json({ success: true, data: { inspection: await populate(Inspection.findById(inspection._id)), postedToLedger, ledgerClosed } });
});

/** DELETE /api/inspections/:id (admin) — drafts only. */
export const deleteInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new ApiError(404, 'Inspection not found');
  if (inspection.status === 'completed') throw new ApiError(422, 'A completed inspection cannot be deleted');
  await inspection.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
