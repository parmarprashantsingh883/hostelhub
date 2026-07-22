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

export async function createOrder({ amountInRupees, receiptId, notes = {} }) {
  if (isLive()) {
    const rp = await getRazorpay();
    const order = await rp.orders.create({
      amount: Math.round(amountInRupees * 100), // paise
      currency: 'INR',
      receipt: receiptId,
      notes, // carried back on the webhook so we can map payment → org/plan
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
      notes,
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

/** Webhooks are a live-only feature — enabled when the webhook secret is set. */
export const webhookMode = () => (process.env.RAZORPAY_WEBHOOK_SECRET ? 'live' : 'off');

/** Verify a Razorpay webhook: HMAC-SHA256 of the RAW request body with the
 *  webhook secret must equal the X-Razorpay-Signature header. */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timing-safe compare (lengths must match first)
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
