import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTLEMENT_DIR = path.join(__dirname, '..', 'uploads', 'settlements');
if (!fs.existsSync(SETTLEMENT_DIR)) fs.mkdirSync(SETTLEMENT_DIR, { recursive: true });

// Business identity printed on the document (configurable per deployment).
const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'Quarters',
  address: process.env.BUSINESS_ADDRESS || '',
  gstin: process.env.BUSINESS_GSTIN || '',
};

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Generate a move-out settlement PDF, save under /uploads/settlements, return
 * its URL path. Reuses the pdfkit layout/branding from receipt.service.js.
 *
 * @param {object} args
 * @param {object} args.tenant      User doc (name, email)
 * @param {object} [args.room]      Room doc (roomNumber, floor, roomType)
 * @param {number} args.depositHeld
 * @param {number} args.pendingDues
 * @param {Array}  args.deductions  [{ amount, reason, at }]
 * @param {number} args.totalDeductions
 * @param {number} args.refund
 */
export async function generateSettlement({
  tenant,
  room,
  depositHeld,
  pendingDues,
  deductions = [],
  totalDeductions,
  refund,
}) {
  const fileName = `settlement-${tenant._id}-${Date.now()}.pdf`;
  const filePath = path.join(SETTLEMENT_DIR, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header band (navy brand)
    doc.rect(0, 0, doc.page.width, 110).fill('#243047');
    doc.fill('#ffffff').fontSize(26).font('Helvetica-Bold').text(BUSINESS.name, 50, 38);
    doc.fontSize(11).font('Helvetica').text('Smart PG & Hostel Management', 50, 70);
    doc.fontSize(16).font('Helvetica-Bold').text('MOVE-OUT SETTLEMENT', 0, 48, { align: 'right', width: doc.page.width - 50 });

    doc.fill('#111827');

    // Meta
    let y = 140;
    doc.fontSize(10).font('Helvetica').fill('#6b7280');
    doc.text(`Settlement No: HH-S-${String(tenant._id).slice(-8).toUpperCase()}`, 50, y);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 0, y, { align: 'right', width: doc.page.width - 50 });

    if (BUSINESS.address || BUSINESS.gstin) {
      y += 16;
      if (BUSINESS.address) { doc.text(BUSINESS.address, 50, y); y += 14; }
      if (BUSINESS.gstin) { doc.text(`GSTIN: ${BUSINESS.gstin}`, 50, y); }
      y -= BUSINESS.address ? 14 : 0;
    }

    // Tenant block
    y += 36;
    doc.fontSize(12).font('Helvetica-Bold').fill('#111827').text('Settlement for', 50, y);
    y += 18;
    doc.fontSize(11).font('Helvetica').text(tenant.name, 50, y);
    y += 15;
    doc.fill('#6b7280').text(tenant.email, 50, y);
    if (room) {
      y += 15;
      doc.text(`Room ${room.roomNumber} · Floor ${room.floor} · ${room.roomType}`, 50, y);
    }

    // Settlement breakdown
    y += 40;
    doc.fill('#111827').font('Helvetica-Bold').fontSize(12).text('Settlement breakdown', 50, y);
    y += 24;

    const rows = [
      ['Security deposit held', money(depositHeld)],
      ['Less: pending rent dues', `- ${money(pendingDues)}`],
      ['Less: deductions', `- ${money(totalDeductions)}`],
    ];
    doc.fill('#111827');
    rows.forEach(([k, v]) => {
      doc.font('Helvetica').fontSize(11).text(k, 50, y);
      doc.font('Helvetica-Bold').text(v, 0, y, { align: 'right', width: doc.page.width - 50 });
      y += 22;
    });

    // Itemised deductions
    if (deductions.length) {
      y += 6;
      doc.font('Helvetica-Bold').fontSize(10).fill('#6b7280').text('Deduction details', 62, y);
      y += 16;
      doc.font('Helvetica').fontSize(10).fill('#6b7280');
      deductions.forEach((d) => {
        const label = `• ${d.reason || 'Deduction'}`;
        doc.text(label, 62, y, { width: doc.page.width - 200 });
        doc.text(money(d.amount), 0, y, { align: 'right', width: doc.page.width - 62 });
        y += 16;
      });
      doc.fill('#111827');
    }

    // Net refund band
    y += 14;
    const refundPositive = refund >= 0;
    doc.rect(50, y, doc.page.width - 100, 40).fill('#f4f6f9');
    doc.fill('#243047').font('Helvetica-Bold').fontSize(13);
    doc.text(refundPositive ? 'NET REFUND TO TENANT' : 'AMOUNT RECOVERABLE FROM TENANT', 62, y + 13);
    doc.text(money(Math.abs(refund)), 0, y + 13, { align: 'right', width: doc.page.width - 62 });

    // Footer
    doc.fontSize(9).fill('#9ca3af').text(
      'This is a computer-generated settlement statement and does not require a signature.',
      50,
      doc.page.height - 80,
      { align: 'center', width: doc.page.width - 100 },
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/settlements/${fileName}`;
}
