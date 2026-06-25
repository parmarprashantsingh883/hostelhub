import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECEIPT_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Business identity printed on the invoice (configurable per deployment).
const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'Quarters',
  address: process.env.BUSINESS_ADDRESS || '',
  gstin: process.env.BUSINESS_GSTIN || '',
};

// Palette — mirrors the app's ink-navy theme.
const NAVY = '#243047';
const INK = '#0f172a';
const SLATE = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e6eaf0';
const BAND = '#f1f5f9';
const GREEN = '#0f9d6e';
const GREEN_BG = '#e7f6f0';

/**
 * Generate a polished rent-receipt PDF, save under /uploads/receipts, return its URL path.
 */
export async function generateReceipt({ rent, tenant, room }) {
  const fileName = `receipt-${rent._id}.pdf`;
  const filePath = path.join(RECEIPT_DIR, fileName);
  const monthLabel = `${MONTHS[rent.month - 1]} ${rent.year}`;

  // Unicode font so ₹ renders; fall back to Helvetica + "Rs." if the bundle is absent.
  const reg = path.join(FONT_DIR, 'DejaVuSans.ttf');
  const bold = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');
  const uni = fs.existsSync(reg) && fs.existsSync(bold);
  const FN = uni ? 'Body' : 'Helvetica';
  const FB = uni ? 'BodyB' : 'Helvetica-Bold';
  const money = (n) => `${uni ? '₹' : 'Rs. '}${Number(n || 0).toLocaleString('en-IN')}`;

  // Verification QR — resolves to the public page that confirms this receipt
  // is genuine. Generated best-effort; a failure must not break the receipt.
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:8080').split(',')[0].trim();
  const verifyUrl = `${clientUrl}/verify/${rent._id}`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verifyUrl, {
      margin: 1,
      width: 240,
      color: { dark: INK, light: '#ffffff' },
    });
  } catch {
    qrBuffer = null;
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    if (uni) {
      doc.registerFont('Body', reg);
      doc.registerFont('BodyB', bold);
    }
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;
    const L = 50;
    const R = W - 50;
    const CW = R - L;

    // ── Header band ────────────────────────────────────────────────────
    doc.rect(0, 0, W, 124).fill(NAVY);
    // little logo square
    doc.roundedRect(L, 40, 30, 30, 7).fill('#33425e');
    doc.fillColor('#ffffff').font(FB).fontSize(15).text('Q', L, 47, { width: 30, align: 'center' });
    doc.fillColor('#ffffff').font(FB).fontSize(22).text(BUSINESS.name, L + 42, 40);
    doc.font(FN).fontSize(10).fillColor('#c2cbd9').text('Smart PG & Hostel Management', L + 42, 69);
    doc.font(FB).fontSize(15).fillColor('#ffffff').text('RENT RECEIPT', L, 44, { width: CW, align: 'right' });
    doc.font(FN).fontSize(9.5).fillColor('#9fabbd').text(`No. HH-${String(rent._id).slice(-8).toUpperCase()}`, L, 66, { width: CW, align: 'right' });

    // ── Billed-to (left) + status pill & details (right) ───────────────
    let y = 158;
    doc.font(FB).fontSize(8.5).fillColor(MUTE).text('BILLED TO', L, y, { characterSpacing: 0.6 });
    doc.font(FB).fontSize(12.5).fillColor(INK).text(tenant?.name || '—', L, y + 14);
    doc.font(FN).fontSize(10).fillColor(SLATE).text(tenant?.email || '', L, y + 31);
    if (room?.roomNumber) {
      doc.fillColor(SLATE).text(`Room ${room.roomNumber} · Floor ${room.floor} · ${room.roomType}`, L, y + 45);
    }

    // Status pill (right)
    const isPaid = rent.status === 'paid';
    const pillText = isPaid ? 'PAID' : String(rent.status || '').toUpperCase();
    doc.font(FB).fontSize(9);
    const tw = doc.widthOfString(pillText);
    const pillW = tw + 30;
    const pillX = R - pillW;
    doc.roundedRect(pillX, y, pillW, 20, 10).fill(isPaid ? GREEN_BG : BAND);
    doc.circle(pillX + 13, y + 10, 3).fill(isPaid ? GREEN : MUTE);
    doc.fillColor(isPaid ? GREEN : SLATE).font(FB).fontSize(9).text(pillText, pillX + 20, y + 6);

    // Details block (right, label/value rows)
    const detX = 330;
    const detW = R - detX;
    let dy = y + 32;
    const details = [
      ['Issue date', new Date().toLocaleDateString('en-IN')],
      ['Payment date', new Date(rent.paidAt || Date.now()).toLocaleDateString('en-IN')],
      ['Method', String(rent.paymentMethod || 'cash').replace(/_/g, ' ').toUpperCase()],
    ];
    details.forEach(([k, v]) => {
      doc.font(FN).fontSize(9.5).fillColor(MUTE).text(k, detX, dy, { width: detW * 0.5 });
      doc.font(FB).fontSize(9.5).fillColor(INK).text(v, detX, dy, { width: detW, align: 'right' });
      dy += 16;
    });
    if (rent.transactionId) {
      doc.font(FN).fontSize(8).fillColor(MUTE).text(rent.transactionId, detX, dy, { width: detW, align: 'right' });
    }

    // ── Items table ────────────────────────────────────────────────────
    y = 268;
    doc.font(FB).fontSize(8.5).fillColor(MUTE).text('DESCRIPTION', L, y, { characterSpacing: 0.6 });
    doc.font(FB).fontSize(8.5).fillColor(MUTE).text('AMOUNT', L, y, { width: CW, align: 'right', characterSpacing: 0.6 });
    y += 15;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(NAVY).stroke();
    y += 14;

    const items = [[`Room rent — ${monthLabel}`, money(rent.rentAmount)]];
    if (rent.electricityCharge) {
      const m = rent.electricityMeta;
      const desc = m?.units ? `Electricity (${m.units} units / ${m.occupants})` : 'Electricity';
      items.push([desc, money(rent.electricityCharge)]);
    }
    if (rent.lateFee) items.push(['Late fee', money(rent.lateFee)]);
    if (rent.discount) items.push(['Discount', `– ${money(rent.discount)}`]);

    items.forEach(([k, v]) => {
      doc.font(FN).fontSize(10.5).fillColor(INK).text(k, L, y, { width: CW * 0.7 });
      doc.font(FB).fontSize(10.5).fillColor(INK).text(v, L, y, { width: CW, align: 'right' });
      y += 23;
      doc.moveTo(L, y - 7).lineTo(R, y - 7).lineWidth(0.5).strokeColor(LINE).stroke();
    });

    // ── Total band ─────────────────────────────────────────────────────
    y += 8;
    doc.roundedRect(L, y, CW, 46, 8).fill(BAND);
    doc.fillColor(NAVY).font(FB).fontSize(12).text('TOTAL PAID', L + 18, y + 16);
    doc.fillColor(NAVY).font(FB).fontSize(17).text(money(rent.totalAmount), L, y + 13, { width: CW - 18, align: 'right' });
    y += 46;

    // ── Business block (optional) ──────────────────────────────────────
    if (BUSINESS.address || BUSINESS.gstin) {
      y += 26;
      doc.font(FB).fontSize(8.5).fillColor(MUTE).text('FROM', L, y, { characterSpacing: 0.6 });
      y += 13;
      doc.font(FN).fontSize(9.5).fillColor(SLATE);
      if (BUSINESS.address) { doc.text(BUSINESS.address, L, y, { width: CW * 0.6 }); y += 13; }
      if (BUSINESS.gstin) doc.text(`GSTIN: ${BUSINESS.gstin}`, L, y);
    }

    // ── Footer (verification QR + notes) ───────────────────────────────
    const fy = H - 116;
    doc.moveTo(L, fy).lineTo(R, fy).lineWidth(0.5).strokeColor(LINE).stroke();

    const qrSize = 64;
    const blockY = fy + 18;
    let textX = L;
    let textW = CW;
    if (qrBuffer) {
      doc.image(qrBuffer, L, blockY, { width: qrSize, height: qrSize });
      doc.font(FB).fontSize(6.5).fillColor(MUTE).text('SCAN TO VERIFY', L, blockY + qrSize + 3, { width: qrSize, align: 'center', characterSpacing: 0.4 });
      textX = L + qrSize + 18;
      textW = R - textX;
    }
    doc.font(FB).fontSize(10.5).fillColor(INK).text('Thank you for staying with us.', textX, blockY + 2, { width: textW });
    doc.font(FN).fontSize(8).fillColor(MUTE).text(
      'This is a computer-generated receipt and does not require a signature. Scan the QR to verify its authenticity online.',
      textX, blockY + 19, { width: textW },
    );
    doc.font(FN).fontSize(7.5).fillColor('#b6bfcd').text(
      `${BUSINESS.name} · generated ${new Date().toLocaleString('en-IN')}`,
      textX, blockY + 46, { width: textW },
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/receipts/${fileName}`;
}
