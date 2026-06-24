import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECEIPT_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Business identity printed on the invoice (configurable per deployment).
const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'HostelHub',
  address: process.env.BUSINESS_ADDRESS || '',
  gstin: process.env.BUSINESS_GSTIN || '',
};

/**
 * Generate a rent receipt PDF, save under /uploads/receipts, return its URL path.
 */
export async function generateReceipt({ rent, tenant, room }) {
  const fileName = `receipt-${rent._id}.pdf`;
  const filePath = path.join(RECEIPT_DIR, fileName);
  const monthLabel = `${MONTHS[rent.month - 1]} ${rent.year}`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header band (emerald brand)
    doc.rect(0, 0, doc.page.width, 110).fill('#243047');
    doc.fill('#ffffff').fontSize(26).font('Helvetica-Bold').text(BUSINESS.name, 50, 38);
    doc.fontSize(11).font('Helvetica').text('Smart PG & Hostel Management', 50, 70);
    doc.fontSize(16).font('Helvetica-Bold').text('RENT RECEIPT', 0, 48, { align: 'right', width: doc.page.width - 50 });

    doc.fill('#111827');

    // Receipt meta
    let y = 140;
    doc.fontSize(10).font('Helvetica').fill('#6b7280');
    doc.text(`Receipt No: HH-${String(rent._id).slice(-8).toUpperCase()}`, 50, y);
    doc.text(`Date: ${new Date(rent.paidAt || Date.now()).toLocaleDateString('en-IN')}`, 0, y, { align: 'right', width: doc.page.width - 50 });

    // Business / billed-by block
    if (BUSINESS.address || BUSINESS.gstin) {
      y += 16;
      if (BUSINESS.address) { doc.text(BUSINESS.address, 50, y); y += 14; }
      if (BUSINESS.gstin) { doc.text(`GSTIN: ${BUSINESS.gstin}`, 50, y); }
      y -= BUSINESS.address ? 14 : 0; // keep downstream layout anchored
    }

    // Tenant block
    y += 36;
    doc.fontSize(12).font('Helvetica-Bold').fill('#111827').text('Received from', 50, y);
    y += 18;
    doc.fontSize(11).font('Helvetica').text(tenant.name, 50, y);
    y += 15;
    doc.fill('#6b7280').text(tenant.email, 50, y);
    if (room) {
      y += 15;
      doc.text(`Room ${room.roomNumber} · Floor ${room.floor} · ${room.roomType}`, 50, y);
    }

    // Amount table
    y += 40;
    const elecLabel = rent.electricityMeta?.units
      ? `Electricity (${rent.electricityMeta.units} units / ${rent.electricityMeta.occupants})`
      : 'Electricity';
    const rows = [
      ['Rent for', monthLabel],
      ['Base rent', `Rs. ${rent.rentAmount.toLocaleString('en-IN')}`],
      ...(rent.electricityCharge ? [[elecLabel, `Rs. ${rent.electricityCharge.toLocaleString('en-IN')}`]] : []),
      ['Late fee', `Rs. ${(rent.lateFee || 0).toLocaleString('en-IN')}`],
      ['Discount', `- Rs. ${(rent.discount || 0).toLocaleString('en-IN')}`],
    ];
    doc.fill('#111827');
    rows.forEach(([k, v]) => {
      doc.font('Helvetica').fontSize(11).text(k, 50, y);
      doc.font('Helvetica-Bold').text(v, 0, y, { align: 'right', width: doc.page.width - 50 });
      y += 22;
    });

    // Total band
    y += 8;
    doc.rect(50, y, doc.page.width - 100, 36).fill('#f4f6f9');
    doc.fill('#243047').font('Helvetica-Bold').fontSize(13);
    doc.text('TOTAL PAID', 62, y + 11);
    doc.text(`Rs. ${rent.totalAmount.toLocaleString('en-IN')}`, 0, y + 11, { align: 'right', width: doc.page.width - 62 });

    // Payment meta
    y += 60;
    doc.fill('#6b7280').font('Helvetica').fontSize(10);
    doc.text(`Payment method: ${(rent.paymentMethod || 'cash').toUpperCase()}`, 50, y);
    if (rent.transactionId) {
      y += 15;
      doc.text(`Transaction ID: ${rent.transactionId}`, 50, y);
    }

    // Footer
    doc.fontSize(9).fill('#9ca3af').text(
      'This is a computer-generated receipt and does not require a signature.',
      50,
      doc.page.height - 80,
      { align: 'center', width: doc.page.width - 100 },
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/receipts/${fileName}`;
}
