import Rent from '../models/Rent.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** Mask a name for a public page: keep the first name, initial the rest.
 *  "Aditya Kulkarni" → "Aditya K." */
const maskName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return parts.map((p, i) => (i === 0 ? p : `${p[0].toUpperCase()}.`)).join(' ');
};

const receiptNo = (id) => `HH-${String(id).slice(-8).toUpperCase()}`;

/** GET /api/public/verify/:id — unauthenticated receipt authenticity check.
 *  The QR printed on every receipt resolves here. Returns only the minimal,
 *  non-sensitive fields needed to confirm a receipt is genuine. */
export const verifyReceipt = asyncHandler(async (req, res) => {
  let rent = null;
  try {
    rent = await Rent.findById(req.params.id)
      .populate('tenantId', 'name')
      .populate('roomId', 'roomNumber');
  } catch {
    rent = null; // malformed id → treated as not found
  }

  if (!rent || rent.status !== 'paid') {
    return res.json({ success: true, data: { valid: false } });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      receiptNo: receiptNo(rent._id),
      business: process.env.BUSINESS_NAME || 'Quarters',
      amount: rent.totalAmount,
      period: `${MONTHS[rent.month - 1]} ${rent.year}`,
      paidAt: rent.paidAt,
      tenant: maskName(rent.tenantId?.name),
      room: rent.roomId?.roomNumber || null,
      method: rent.paymentMethod || null,
    },
  });
});
