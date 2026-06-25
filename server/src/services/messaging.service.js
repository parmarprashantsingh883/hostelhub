/**
 * Messaging service — WhatsApp + SMS.
 *
 * FREE by default (no account, no keys): builds click-to-send deep links —
 * `wa.me` for WhatsApp and `sms:` for SMS — with the message pre-filled. The
 * admin/staff taps it and sends from their own WhatsApp / phone. Works today,
 * costs nothing.
 *
 * LIVE (optional, env-gated) for true automation:
 *   • WhatsApp Cloud API  → set WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 *     (Meta's official API has a free service-conversation tier).
 *   • SMS via Twilio      → set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_SMS_FROM
 *
 * Mirrors payment.service / email.service: the same call works in both modes,
 * so the UI and flows are exercisable locally without any paid provider.
 */

const DEFAULT_CC = process.env.DEFAULT_COUNTRY_CODE || '91'; // India

/** Strip everything but digits. */
const digits = (p) => String(p || '').replace(/\D/g, '');

/** Best-effort E.164 (no '+'): assume the default country code for bare 10-digit numbers. */
export const toE164 = (phone) => {
  let d = digits(phone);
  if (d.length === 10) d = DEFAULT_CC + d; // bare local mobile → prepend CC
  return d;
};

/** Free WhatsApp click-to-send link (opens WhatsApp with the message pre-filled). */
export const waLink = (phone, text) => `https://wa.me/${toE164(phone)}?text=${encodeURIComponent(text)}`;

/** Free SMS click-to-send link (opens the device SMS app with the body pre-filled). */
export const smsLink = (phone, text) => `sms:${digits(phone)}?body=${encodeURIComponent(text)}`;

export const whatsappMode = () =>
  (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID ? 'cloud' : 'link');

export const smsServiceMode = () =>
  (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM ? 'twilio' : 'link');

/**
 * Send a WhatsApp message. Live mode posts to the Cloud API; otherwise returns
 * a free click-to-send link for the caller to open. Never throws — messaging
 * is best-effort and must not break the request that triggered it.
 */
export async function sendWhatsApp({ to, text }) {
  if (!to) return { mode: 'link', url: '', skipped: 'no phone number' };
  if (whatsappMode() !== 'cloud') return { mode: 'link', url: waLink(to, text) };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: toE164(to), type: 'text', text: { body: text } }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('💬 WhatsApp Cloud send failed:', data?.error?.message || res.status);
      return { mode: 'cloud', sent: false, error: data?.error?.message || `HTTP ${res.status}`, url: waLink(to, text) };
    }
    return { mode: 'cloud', sent: true, id: data?.messages?.[0]?.id || null };
  } catch (err) {
    console.error('💬 WhatsApp Cloud error:', err.message);
    return { mode: 'cloud', sent: false, error: err.message, url: waLink(to, text) };
  }
}

/** Send an SMS. Live mode uses Twilio; otherwise returns a free click-to-send link. */
export async function sendSms({ to, text }) {
  if (!to) return { mode: 'link', url: '', skipped: 'no phone number' };
  if (smsServiceMode() !== 'twilio') return { mode: 'link', url: smsLink(to, text) };
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const body = new URLSearchParams({ To: `+${toE164(to)}`, From: process.env.TWILIO_SMS_FROM, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('💬 SMS (Twilio) send failed:', data?.message || res.status);
      return { mode: 'twilio', sent: false, error: data?.message || `HTTP ${res.status}`, url: smsLink(to, text) };
    }
    return { mode: 'twilio', sent: true, id: data?.sid || null };
  } catch (err) {
    console.error('💬 SMS (Twilio) error:', err.message);
    return { mode: 'twilio', sent: false, error: err.message, url: smsLink(to, text) };
  }
}

/** Plain-text message bodies (WhatsApp/SMS don't render HTML). Keep them short. */
export const messageTemplates = {
  rentReminder: (name, monthLabel, amount, dueDate, payUrl) =>
    `Hi ${name}, your ${monthLabel} rent of ₹${Number(amount || 0).toLocaleString('en-IN')} is due${dueDate ? ` by ${dueDate}` : ''}.`
    + `${payUrl ? ` Pay here: ${payUrl}` : ' Please pay on time to avoid late fees.'}`
    + ` — Quarters`,
  paymentReceived: (name, monthLabel, amount) =>
    `Hi ${name}, we've received your ₹${Number(amount || 0).toLocaleString('en-IN')} rent for ${monthLabel}. Thank you! — Quarters`,
  welcome: (name) =>
    `Welcome to Quarters, ${name}! Your resident account is ready. You can pay rent, raise complaints and pre-register visitors from your dashboard.`,
};
