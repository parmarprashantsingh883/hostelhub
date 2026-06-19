import nodemailer from 'nodemailer';

/**
 * Email service. With no SMTP creds configured (dev default), emails are
 * pretty-printed to the console instead of sent — so every email flow is
 * testable locally without an SMTP account.
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('\n━━━ 📧 EMAIL (dev console mode) ━━━');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { dev: true };
  }
  return t.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
}

export const emailTemplates = {
  resetPassword: (name, link) => ({
    subject: 'HostelHub — Reset your password',
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your HostelHub password. This link is valid for <b>30 minutes</b>.</p>
      <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none">Reset password</a></p>
      <p style="color:#666;font-size:13px">If you didn't ask for this, you can safely ignore this email.</p>
    </div>`,
  }),
  rentReminder: (name, monthLabel, amount, dueDate) => ({
    subject: `HostelHub — Rent reminder for ${monthLabel}`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2>Hi ${name},</h2>
      <p>Your rent of <b>₹${amount}</b> for <b>${monthLabel}</b> is due by <b>${dueDate}</b>.</p>
      <p>Please pay on time to avoid late fees. You can pay online from your HostelHub dashboard.</p>
    </div>`,
  }),
  paymentReceipt: (name, monthLabel, amount, txnId) => ({
    subject: `HostelHub — Payment received for ${monthLabel}`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2>Thank you, ${name}!</h2>
      <p>We received your rent payment of <b>₹${amount}</b> for <b>${monthLabel}</b>.</p>
      <p>Transaction ID: <code>${txnId}</code></p>
      <p>Your receipt is available in your dashboard under <b>My Rent → History</b>.</p>
    </div>`,
  }),
  urgentNotice: (title, content) => ({
    subject: `🚨 HostelHub URGENT — ${title}`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2 style="color:#dc2626">${title}</h2>
      <p>${content}</p>
    </div>`,
  }),
};
