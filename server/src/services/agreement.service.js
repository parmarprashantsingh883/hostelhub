import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSettings } from './settings.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'uploads', 'agreements');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

const NAVY = '#243047';
const INK = '#0f172a';
const SLATE = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e6eaf0';
const BAND = '#f1f5f9';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** Generate a rental-agreement PDF; returns its /uploads URL path. */
export async function generateAgreement({ agreement, tenant, room }) {
  const fileName = `agreement-${agreement._id}.pdf`;
  const filePath = path.join(DIR, fileName);

  let biz = { name: 'Quarters', address: '', email: '', phone: '' };
  try {
    const s = await getSettings();
    if (s?.business) biz = { name: s.business.name || biz.name, address: s.business.address || '', email: s.business.email || '', phone: s.business.phone || '' };
  } catch { /* env defaults */ }

  const reg = path.join(FONT_DIR, 'DejaVuSans.ttf');
  const bold = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');
  const uni = fs.existsSync(reg) && fs.existsSync(bold);
  const FN = uni ? 'Body' : 'Helvetica';
  const FB = uni ? 'BodyB' : 'Helvetica-Bold';
  const money = (n) => `${uni ? '₹' : 'Rs. '}${Number(n || 0).toLocaleString('en-IN')}`;

  const end = new Date(agreement.startDate);
  end.setMonth(end.getMonth() + (agreement.durationMonths || 11));

  const clauses = [
    `The Tenant shall pay a monthly rent of ${money(agreement.rentAmount)}, due on or before the ${agreement.dueDay}${agreement.dueDay === 1 ? 'st' : agreement.dueDay === 2 ? 'nd' : agreement.dueDay === 3 ? 'rd' : 'th'} of each month.`,
    `A refundable security deposit of ${money(agreement.depositAmount)} is held for the term, refundable at move-out after deduction of dues and any damages.`,
    `This agreement runs for ${agreement.durationMonths} month(s) from ${fmtDate(agreement.startDate)} to ${fmtDate(end)}.`,
    'The Tenant shall keep the premises clean and report any damage or maintenance issue promptly.',
    'Either party may terminate with one (1) month written notice. Sub-letting is not permitted.',
    'House rules, visitor policy and common-area guidelines published by the management form part of this agreement.',
  ];

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    if (uni) { doc.registerFont('Body', reg); doc.registerFont('BodyB', bold); }
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = doc.page.width; const H = doc.page.height; const L = 50; const R = W - 50; const CW = R - L;

    // Header
    doc.rect(0, 0, W, 110).fill(NAVY);
    doc.roundedRect(L, 34, 30, 30, 7).fill('#33425e');
    doc.fillColor('#fff').font(FB).fontSize(15).text('Q', L, 41, { width: 30, align: 'center' });
    doc.fillColor('#fff').font(FB).fontSize(20).text(biz.name, L + 42, 34);
    doc.font(FN).fontSize(9.5).fillColor('#c2cbd9').text('Smart PG & Hostel Management', L + 42, 60);
    doc.font(FB).fontSize(14).fillColor('#fff').text('RENTAL AGREEMENT', L, 38, { width: CW, align: 'right' });
    doc.font(FN).fontSize(9).fillColor('#9fabbd').text(`No. AG-${String(agreement._id).slice(-8).toUpperCase()}`, L, 60, { width: CW, align: 'right' });

    let y = 134;
    doc.font(FN).fontSize(9.5).fillColor(MUTE).text(`Dated ${fmtDate(agreement.createdAt || new Date())}`, L, y);
    y += 22;

    // Parties
    doc.font(FB).fontSize(8.5).fillColor(MUTE).text('LANDLORD', L, y, { characterSpacing: 0.6 });
    doc.font(FB).fontSize(8.5).fillColor(MUTE).text('TENANT', 320, y, { characterSpacing: 0.6 });
    y += 14;
    doc.font(FB).fontSize(11).fillColor(INK).text(biz.name, L, y, { width: 250 });
    doc.font(FB).fontSize(11).fillColor(INK).text(tenant?.name || '—', 320, y, { width: 230 });
    y += 15;
    doc.font(FN).fontSize(9).fillColor(SLATE).text(biz.address || '—', L, y, { width: 250 });
    doc.font(FN).fontSize(9).fillColor(SLATE).text(tenant?.email || '', 320, y, { width: 230 });
    y += 12;
    if (biz.phone) doc.text(biz.phone, L, y, { width: 250 });
    if (tenant?.phone) doc.text(tenant.phone, 320, y, { width: 230 });
    y += 24;

    // Terms band
    doc.roundedRect(L, y, CW, 64, 8).fill(BAND);
    const cells = [
      ['Room', room?.roomNumber ? `Room ${room.roomNumber}` : '—'],
      ['Monthly rent', money(agreement.rentAmount)],
      ['Security deposit', money(agreement.depositAmount)],
      ['Term', `${agreement.durationMonths} months`],
    ];
    const cw = CW / 4;
    cells.forEach(([k, v], i) => {
      const cx = L + i * cw + 14;
      doc.font(FN).fontSize(8).fillColor(MUTE).text(k.toUpperCase(), cx, y + 14, { characterSpacing: 0.4 });
      doc.font(FB).fontSize(12).fillColor(NAVY).text(v, cx, y + 30);
    });
    y += 84;

    // Clauses
    doc.font(FB).fontSize(10).fillColor(INK).text('Terms & conditions', L, y);
    y += 18;
    clauses.forEach((c, i) => {
      doc.font(FB).fontSize(9.5).fillColor(NAVY).text(`${i + 1}.`, L, y, { width: 16 });
      doc.font(FN).fontSize(9.5).fillColor(SLATE).text(c, L + 18, y, { width: CW - 18 });
      y = doc.y + 8;
    });
    if (agreement.terms) {
      doc.font(FB).fontSize(9.5).fillColor(NAVY).text(`${clauses.length + 1}.`, L, y, { width: 16 });
      doc.font(FN).fontSize(9.5).fillColor(SLATE).text(agreement.terms, L + 18, y, { width: CW - 18 });
      y = doc.y + 8;
    }

    // Signatures
    const sy = H - 130;
    doc.moveTo(L, sy).lineTo(R, sy).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.font(FN).fontSize(9).fillColor(SLATE).text('For the Landlord', L, sy + 18);
    doc.font(FB).fontSize(10.5).fillColor(INK).text(biz.name, L, sy + 34);
    doc.font(FN).fontSize(9).fillColor(SLATE).text('Tenant', 320, sy + 18);
    if (agreement.status === 'signed') {
      doc.font(FB).fontSize(10.5).fillColor('#0f9d6e').text(`✓ ${agreement.signerName || tenant?.name}`, 320, sy + 34);
      doc.font(FN).fontSize(8).fillColor(MUTE).text(`Signed electronically on ${fmtDate(agreement.signedAt || new Date())}`, 320, sy + 50, { width: 230 });
    } else {
      doc.font(FN).fontSize(9).fillColor(MUTE).text('________________________  (to be e-signed)', 320, sy + 36);
    }
    doc.font(FN).fontSize(7.5).fillColor('#b6bfcd').text(`${biz.name} · computer-generated agreement`, L, H - 40, { width: CW, align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/agreements/${fileName}`;
}
