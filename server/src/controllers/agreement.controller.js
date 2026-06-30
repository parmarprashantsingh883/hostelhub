import Agreement from '../models/Agreement.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { generateAgreement } from '../services/agreement.service.js';
import { notify } from '../services/notification.service.js';

const populate = (q) => q.populate('tenantId', 'name email phone').populate('roomId', 'roomNumber floor roomType');

/** GET /api/agreements?status= (admin) */
export const listAgreements = asyncHandler(async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {};
  const agreements = await populate(Agreement.find(q)).sort({ createdAt: -1 });
  res.json({ success: true, data: { agreements } });
});

/** POST /api/agreements (admin) — generate & send a tenant's agreement. */
export const createAgreement = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  const tenant = await User.findOne({ _id: tenantId, role: 'tenant' }).populate('tenantProfile.roomId', 'roomNumber floor roomType');
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  const tp = tenant.tenantProfile || {};

  const agreement = await Agreement.create({
    tenantId,
    roomId: tp.roomId?._id || tp.roomId || null,
    rentAmount: req.body.rentAmount != null ? Math.max(0, Number(req.body.rentAmount)) : (tp.rentAmount || 0),
    depositAmount: req.body.depositAmount != null ? Math.max(0, Number(req.body.depositAmount)) : (tp.securityDeposit || 0),
    dueDay: Number(req.body.dueDay) || 5,
    startDate: req.body.startDate || tp.joiningDate || new Date(),
    durationMonths: Number(req.body.durationMonths) || 11,
    terms: req.body.terms || '',
    status: 'sent',
    createdBy: req.user._id,
  });

  const room = tp.roomId?.roomNumber ? tp.roomId : null;
  agreement.pdfUrl = await generateAgreement({ agreement, tenant, room });
  await agreement.save();

  await User.findByIdAndUpdate(tenantId, { 'tenantProfile.agreementStatus': 'sent' });
  await notify(tenantId, { title: 'Rental agreement sent', message: 'Please review and e-sign your rental agreement.', type: 'general', link: '/tenant/agreement' });

  res.status(201).json({ success: true, data: { agreement: await populate(Agreement.findById(agreement._id)) } });
});

/** GET /api/agreements/me (tenant) — the tenant's latest agreement. */
export const myAgreement = asyncHandler(async (req, res) => {
  const agreement = await populate(Agreement.findOne({ tenantId: req.user._id }).sort({ createdAt: -1 }));
  res.json({ success: true, data: { agreement: agreement || null } });
});

/** PUT /api/agreements/:id/sign (tenant) { signerName } — e-sign. */
export const signAgreement = asyncHandler(async (req, res) => {
  const agreement = await populate(Agreement.findById(req.params.id));
  if (!agreement) throw new ApiError(404, 'Agreement not found');
  if (String(agreement.tenantId._id) !== String(req.user._id)) throw new ApiError(403, 'Not your agreement');
  if (agreement.status === 'signed') throw new ApiError(409, 'Already signed');
  if (agreement.status !== 'sent') throw new ApiError(422, 'This agreement is not open for signing');

  agreement.status = 'signed';
  agreement.signedAt = new Date();
  agreement.signerName = (req.body.signerName || agreement.tenantId.name || '').trim();
  agreement.signedFrom = req.ip || '';
  const room = agreement.roomId?.roomNumber ? agreement.roomId : null;
  agreement.pdfUrl = await generateAgreement({ agreement, tenant: agreement.tenantId, room });
  await agreement.save();

  await User.findByIdAndUpdate(req.user._id, { 'tenantProfile.agreementStatus': 'signed' });
  res.json({ success: true, data: { agreement } });
});

/** GET /api/agreements/:id/pdf (admin or owning tenant) — lazily generates. */
export const getAgreementPdf = asyncHandler(async (req, res) => {
  const agreement = await populate(Agreement.findById(req.params.id));
  if (!agreement) throw new ApiError(404, 'Agreement not found');
  if (req.user.role !== 'admin' && String(agreement.tenantId._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your agreement');
  }
  if (!agreement.pdfUrl) {
    const room = agreement.roomId?.roomNumber ? agreement.roomId : null;
    agreement.pdfUrl = await generateAgreement({ agreement, tenant: agreement.tenantId, room });
    await agreement.save();
  }
  res.json({ success: true, data: { pdfUrl: agreement.pdfUrl } });
});

/** DELETE /api/agreements/:id (admin) — unless already signed. */
export const deleteAgreement = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) throw new ApiError(404, 'Agreement not found');
  if (agreement.status === 'signed') throw new ApiError(422, 'A signed agreement cannot be deleted');
  await agreement.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
