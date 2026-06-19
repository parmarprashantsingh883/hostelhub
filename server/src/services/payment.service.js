import crypto from 'crypto';

/**
 * Payment gateway adapter.
 * With RAZORPAY_KEY_ID configured → real Razorpay orders + signature verify.
 * Without (dev default) → mock mode: orders are fake but the full
 * create-order → pay → verify → receipt flow works end-to-end so the
 * UI and DB writes can be exercised locally.
 */
const isLive = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
async function getRazorpay() {
  if (razorpay) return razorpay;
  const Razorpay = (await import('razorpay')).default;
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

export async function createOrder({ amountInRupees, receiptId }) {
  if (isLive()) {
    const rp = await getRazorpay();
    const order = await rp.orders.create({
      amount: Math.round(amountInRupees * 100), // paise
      currency: 'INR',
      receipt: receiptId,
    });
    return { mode: 'live', keyId: process.env.RAZORPAY_KEY_ID, order };
  }
  // Mock order
  return {
    mode: 'mock',
    keyId: 'rzp_test_mock',
    order: {
      id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt: receiptId,
      status: 'created',
    },
  };
}

export function verifySignature({ orderId, paymentId, signature }) {
  if (!isLive()) {
    // Mock mode: any non-empty signature passes
    return !!paymentId;
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

export const paymentMode = () => (isLive() ? 'live' : 'mock');
