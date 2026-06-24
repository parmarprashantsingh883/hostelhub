/**
 * Seed script — demo data for Quarters.
 * Run standalone: `npm run seed` (uses MONGO_URI)
 * Or auto-runs on boot when USE_MEMORY_DB=true.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Rent from '../models/Rent.js';
import Complaint from '../models/Complaint.js';
import Notice from '../models/Notice.js';
import Visitor from '../models/Visitor.js';
import FoodMenu from '../models/FoodMenu.js';
import Expense from '../models/Expense.js';
import Lead from '../models/Lead.js';
import DepositLedger from '../models/DepositLedger.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export async function runSeed({ exitAfter = true } = {}) {
  if (!mongoose.connection.readyState) {
    const { connectDB } = await import('../config/db.js');
    await connectDB();
  }

  const already = await User.findOne({ email: 'admin@quarters.app' });
  if (already) {
    console.log('🌱 Seed skipped — demo data already present');
    if (exitAfter) process.exit(0);
    return;
  }

  console.log('🌱 Seeding demo data…');

  // ── Admin ──────────────────────────────────────────────
  const admin = await User.create({
    name: 'Demo Admin',
    email: 'admin@quarters.app',
    phone: '+91 9000000001',
    password: 'Admin@123',
    role: 'admin',
  });

  // ── Rooms (10) ────────────────────────────────────────
  const roomSpecs = [
    { roomNumber: '101', floor: 1, roomType: 'single', capacity: 1, rentAmount: 9000, facilities: ['AC', 'Attached bath', 'Wi-Fi'] },
    { roomNumber: '102', floor: 1, roomType: 'double', capacity: 2, rentAmount: 7000, facilities: ['Wi-Fi', 'Balcony'] },
    { roomNumber: '103', floor: 1, roomType: 'double', capacity: 2, rentAmount: 7000, facilities: ['Wi-Fi'] },
    { roomNumber: '104', floor: 1, roomType: 'triple', capacity: 3, rentAmount: 6000, facilities: ['Wi-Fi', 'Study table'] },
    { roomNumber: '201', floor: 2, roomType: 'single', capacity: 1, rentAmount: 9500, facilities: ['AC', 'Wi-Fi'] },
    { roomNumber: '202', floor: 2, roomType: 'double', capacity: 2, rentAmount: 7200, facilities: ['Wi-Fi'] },
    { roomNumber: '203', floor: 2, roomType: 'triple', capacity: 3, rentAmount: 6200, facilities: ['Wi-Fi', 'Balcony'] },
    { roomNumber: '204', floor: 2, roomType: 'dormitory', capacity: 6, rentAmount: 4500, facilities: ['Wi-Fi', 'Lockers'] },
    { roomNumber: '301', floor: 3, roomType: 'single', capacity: 1, rentAmount: 10000, facilities: ['AC', 'Wi-Fi', 'Attached bath'] },
    { roomNumber: '302', floor: 3, roomType: 'double', capacity: 2, rentAmount: 7500, facilities: ['Wi-Fi'], status: 'maintenance' },
  ];
  const rooms = await Room.create(roomSpecs);
  const roomByNumber = Object.fromEntries(rooms.map((r) => [r.roomNumber, r]));

  // ── Tenants — fill rooms for a healthy demo occupancy (20 of 23 beds) ──
  // [roomNumber, occupants] — 302 is under maintenance, one dorm bed left vacant.
  const FILL = [
    ['101', 1], ['102', 2], ['103', 2], ['104', 3], ['201', 1],
    ['202', 2], ['203', 3], ['204', 5], ['301', 1],
  ];
  // First five names are kept stable (referenced by complaints/visitors below).
  const NAMES = [
    'Demo Tenant', 'Aarav Shah', 'Priya Patel', 'Rohan Mehta', 'Sneha Iyer',
    'Karan Nair', 'Isha Gupta', 'Vikram Rao', 'Neha Singh', 'Arjun Das',
    'Meera Joshi', 'Sanjay Pillai', 'Divya Menon', 'Pooja Reddy', 'Aditya Kulkarni',
    'Tara Bose', 'Nikhil Jain', 'Ananya Krishnan', 'Farhan Khan', 'Ritu Sharma',
  ];
  const tenants = [];
  let ni = 0;
  for (const [roomNo, count] of FILL) {
    const room = roomByNumber[roomNo];
    for (let j = 0; j < count; j++) {
      const name = NAMES[ni] || `Resident ${ni + 1}`;
      const email = ni === 0 ? 'tenant@quarters.app' : `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
      const tenant = await User.create({
        name,
        email,
        phone: `+91 90000${String(10000 + ni).slice(-5)}`,
        password: 'Tenant@123',
        role: 'tenant',
        tenantProfile: {
          roomId: room._id,
          joiningDate: new Date(Date.now() - (150 - ni * 5) * 24 * 3600 * 1000),
          securityDeposit: room.rentAmount,
          rentAmount: room.rentAmount,
          status: 'active',
          emergencyContact: { name: 'Family Contact', phone: '+91 9111111111', relation: 'parent' },
          idProof: { type: 'aadhaar', number: 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000) },
          policeVerification: ['verified', 'verified', 'submitted', 'pending'][ni % 4],
          agreementStatus: ['signed', 'signed', 'sent', 'not_sent'][ni % 4],
        },
      });
      room.assignedTenants.push(tenant._id);
      tenants.push(tenant);
      ni++;
    }
    room.currentOccupancy = count;
    room.status = count >= room.capacity ? 'occupied' : count > 0 ? 'partially_occupied' : 'vacant';
    await room.save();
  }

  // ── Staff (3) ─────────────────────────────────────────
  const staffSpecs = [
    { name: 'Demo Staff', email: 'staff@quarters.app', phone: '+91 9000000007', staffType: 'maintenance' },
    { name: 'Ganesh Kumar', email: 'ganesh@example.com', phone: '+91 9000000008', staffType: 'security' },
    { name: 'Lakshmi Devi', email: 'lakshmi@example.com', phone: '+91 9000000009', staffType: 'cook' },
  ];
  const staff = [];
  for (const s of staffSpecs) {
    staff.push(
      await User.create({
        name: s.name,
        email: s.email,
        phone: s.phone,
        password: 'Staff@123',
        role: 'staff',
        staffProfile: { staffType: s.staffType, status: 'active', salary: 18000 },
      }),
    );
  }

  // ── Rents — last 6 months, revenue ramping up; current month mostly paid ──
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const mkRent = (t, m, y, paid) => Rent.create({
    tenantId: t._id,
    roomId: t.tenantProfile.roomId,
    month: m,
    year: y,
    rentAmount: t.tenantProfile.rentAmount,
    totalAmount: t.tenantProfile.rentAmount,
    dueDate: new Date(y, m - 1, 5),
    status: paid ? 'paid' : 'pending',
    ...(paid
      ? {
          paymentMethod: Math.random() < 0.5 ? 'upi' : 'razorpay',
          transactionId: `SEED-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          paidAt: new Date(y, m - 1, 4),
        }
      : {}),
  });

  // Past 5 months: a growing number of residents paid (upward revenue trend).
  const paidByOffset = { 5: 9, 4: 11, 3: 13, 2: 15, 1: 17 };
  for (const off of [5, 4, 3, 2, 1]) {
    const d = new Date(cy, cm - 1 - off, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const k = paidByOffset[off];
    for (let i = 0; i < k && i < tenants.length; i++) await mkRent(tenants[i], m, y, true);
  }
  // Current month: first 2 residents pending (for the Pending KPI), the rest paid.
  for (let i = 0; i < tenants.length; i++) await mkRent(tenants[i], cm, cy, i >= 2);

  // ── Electricity — split two rooms' sub-meter bills into the current month ──
  const elecRooms = [
    { no: '102', units: 118, rate: 8 },
    { no: '203', units: 210, rate: 8 },
  ];
  for (const er of elecRooms) {
    const room = roomByNumber[er.no];
    const occ = await User.find({ role: 'tenant', 'tenantProfile.status': 'active', 'tenantProfile.roomId': room._id });
    if (!occ.length) continue;
    const total = er.units * er.rate;
    const base = Math.floor(total / occ.length);
    const remainder = total - base * occ.length;
    for (let i = 0; i < occ.length; i++) {
      const rent = await Rent.findOne({ tenantId: occ[i]._id, month: cm, year: cy });
      if (!rent) continue;
      rent.electricityCharge = base + (i === occ.length - 1 ? remainder : 0);
      rent.electricityMeta = { units: er.units, ratePerUnit: er.rate, occupants: occ.length };
      await rent.save();
    }
  }

  // ── Complaints (14 — realistic status mix, most resolved) ─────────────
  const complaintSpecs = [
    { title: 'Wi-Fi very slow on floor 2', category: 'wifi', priority: 'high', tenant: 0, status: 'assigned', staff: 0 },
    { title: 'Tap leaking in bathroom', category: 'water', priority: 'medium', tenant: 1, status: 'in_progress', staff: 0 },
    { title: 'Tube light flickering', category: 'electricity', priority: 'low', tenant: 2, status: 'resolved', staff: 0, rating: 4, feedback: 'Fixed the same day, thanks!' },
    { title: 'Room cleaning skipped twice', category: 'cleaning', priority: 'medium', tenant: 3, status: 'resolved', staff: 0, rating: 5, feedback: 'Sorted out quickly.' },
    { title: 'Cupboard hinge broken', category: 'furniture', priority: 'low', tenant: 4, status: 'pending' },
    { title: 'Geyser not heating water', category: 'electricity', priority: 'high', tenant: 5, status: 'resolved', staff: 0, rating: 4 },
    { title: 'Bathroom drain blocked', category: 'water', priority: 'urgent', tenant: 6, status: 'resolved', staff: 0, rating: 3, feedback: 'Took a while but resolved.' },
    { title: 'AC not cooling in room 101', category: 'maintenance', priority: 'high', tenant: 0, status: 'in_progress', staff: 0 },
    { title: 'Main door lock is loose', category: 'security', priority: 'medium', tenant: 7, status: 'resolved', staff: 1, rating: 5, feedback: 'Replaced promptly.' },
    { title: 'Dinner quality dropped this week', category: 'food', priority: 'medium', tenant: 8, status: 'rejected', remarks: 'Menu reviewed with the cook; portions and spice levels adjusted.' },
    { title: "Window won't close fully", category: 'furniture', priority: 'low', tenant: 9, status: 'resolved', staff: 0, rating: 4 },
    { title: 'Wi-Fi router needs a restart', category: 'wifi', priority: 'low', tenant: 10, status: 'resolved', staff: 0, rating: 5 },
    { title: 'Cockroaches in shared kitchen', category: 'cleaning', priority: 'high', tenant: 11, status: 'pending' },
    { title: 'Hot water timing too short', category: 'water', priority: 'low', tenant: 12, status: 'resolved', staff: 0, rating: 4 },
  ];
  for (let ci = 0; ci < complaintSpecs.length; ci++) {
    const c = complaintSpecs[ci];
    const t = tenants[c.tenant];
    await Complaint.create({
      title: c.title,
      description: `${c.title}. Please look into this when possible.`,
      category: c.category,
      priority: c.priority,
      tenantId: t._id,
      roomId: t.tenantProfile.roomId,
      assignedStaffId: c.staff !== undefined ? staff[c.staff]._id : null,
      status: c.status,
      rating: c.rating || null,
      ...(c.feedback ? { tenantFeedback: c.feedback } : {}),
      ...(c.remarks ? { adminRemarks: c.remarks } : {}),
      resolvedAt: c.status === 'resolved' ? new Date(Date.now() - (ci + 1) * 2 * 24 * 3600 * 1000) : null,
    });
  }

  // ── Notices (5) ───────────────────────────────────────
  await Notice.create([
    { title: 'Water supply maintenance on Sunday', content: 'Water will be unavailable 10am–1pm this Sunday due to tank cleaning.', category: 'maintenance', priority: 'important', isPinned: true, targetAudience: 'all', createdBy: admin._id },
    { title: 'Rent due reminder', content: 'Monthly rent is due by the 5th. Late fee of ₹100/day applies after the 10th.', category: 'rent', priority: 'normal', targetAudience: 'tenants', createdBy: admin._id },
    { title: 'New gym equipment installed', content: 'Treadmill and weights are now available in the common room. Timing: 6–9 am & 6–9 pm.', category: 'general', priority: 'normal', targetAudience: 'all', createdBy: admin._id },
    { title: 'Visitors policy update', content: 'All visitors must be pre-registered by tenants. Entry only with security verification.', category: 'rules', priority: 'important', targetAudience: 'all', createdBy: admin._id },
    { title: 'Diwali dinner special 🎉', content: 'Special festive dinner on Diwali night. Veg thali + sweets for everyone!', category: 'food', priority: 'normal', targetAudience: 'tenants', createdBy: admin._id },
  ]);

  // ── Visitors — realistic mix: checked-out, inside now, expected, rejected ──
  const H = 3600 * 1000;
  const visitorSpecs = [
    { t: 0, name: 'Rahul Verma', phone: '+91 9222200001', purpose: 'Family visit', exp: -5 * H, status: 'checked_out', entry: -5 * H, exit: -2 * H },
    { t: 2, name: 'Sunita Rao', phone: '+91 9222200002', purpose: 'Parents visiting', exp: -4 * H, status: 'checked_out', entry: -4 * H, exit: -1 * H },
    { t: 5, name: 'Amazon Delivery', phone: '+91 9222200003', purpose: 'Parcel handover', exp: -3 * H, status: 'checked_out', entry: -3 * H, exit: -2.9 * H },
    { t: 1, name: 'Amit Joshi', phone: '+91 9222200004', purpose: 'Friend dropping by', exp: -2 * H, status: 'checked_in', entry: -2 * H, exit: null },
    { t: 7, name: 'Priya Desai', phone: '+91 9222200005', purpose: 'Relative', exp: -1 * H, status: 'checked_in', entry: -1 * H, exit: null },
    { t: 3, name: 'Vikas Kumar', phone: '+91 9222200006', purpose: 'Family visit', exp: 3 * H, status: 'expected' },
    { t: 9, name: 'Neha Agarwal', phone: '+91 9222200007', purpose: 'Document handover', exp: 5 * H, status: 'expected' },
    { t: 4, name: 'Ramesh Tiwari', phone: '+91 9222200008', purpose: 'Maintenance vendor', exp: 26 * H, status: 'expected' },
    { t: 6, name: 'Unlisted caller', phone: '+91 9222200009', purpose: 'Unannounced', exp: -6 * H, status: 'rejected' },
  ];
  for (const v of visitorSpecs) {
    await Visitor.create({
      tenantId: tenants[v.t]._id,
      visitorName: v.name,
      visitorPhone: v.phone,
      purpose: v.purpose,
      expectedDateTime: new Date(now.getTime() + v.exp),
      entryTime: v.entry != null ? new Date(now.getTime() + v.entry) : null,
      exitTime: v.exit != null ? new Date(now.getTime() + v.exit) : null,
      status: v.status,
      approvedBy: v.status === 'checked_in' || v.status === 'checked_out' ? admin._id : null,
    });
  }

  // ── Food menu (current week) ──────────────────────────
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const menus = [
    ['Poha + Tea', 'Dal, Rice, Roti, Bhindi Sabzi', 'Samosa + Chai', 'Paneer Butter Masala, Roti, Rice'],
    ['Idli Sambhar', 'Rajma Chawal, Salad', 'Biscuits + Tea', 'Veg Pulao, Raita, Papad'],
    ['Aloo Paratha + Curd', 'Chole, Rice, Roti', 'Pakora + Chai', 'Dal Tadka, Jeera Rice, Roti'],
    ['Upma + Coffee', 'Kadhi Chawal, Aloo Sabzi', 'Fruit Chaat', 'Veg Biryani, Raita'],
    ['Bread Omelette / Toast', 'Dal Makhani, Rice, Roti', 'Vada Pav', 'Matar Paneer, Roti, Rice'],
    ['Chhole Bhature', 'Veg Thali Special', 'Maggi + Tea', 'Pav Bhaji'],
    ['Masala Dosa', 'Sunday Special: Paneer Thali', 'Cake + Juice', 'Fried Rice + Manchurian'],
  ];
  // Resident food feedback (drives the avg rating + most-liked/disliked).
  const FB = {
    0: [{ t: 1, meal: 'lunch', r: 5, c: 'Loved the paneer butter masala' }, { t: 3, meal: 'dinner', r: 4 }],
    1: [{ t: 2, meal: 'breakfast', r: 4 }, { t: 5, meal: 'lunch', r: 3, c: 'Rajma was a bit bland' }],
    2: [{ t: 4, meal: 'dinner', r: 5, c: 'Dal tadka was great' }, { t: 7, meal: 'snacks', r: 2, c: 'Pakoras were cold' }],
    3: [{ t: 6, meal: 'lunch', r: 4 }, { t: 8, meal: 'dinner', r: 5 }],
    4: [{ t: 9, meal: 'dinner', r: 4, c: 'Matar paneer 👍' }],
    5: [{ t: 10, meal: 'lunch', r: 5, c: 'Thali special was 🔥' }],
    6: [{ t: 0, meal: 'lunch', r: 4, c: 'Sunday thali was nice' }],
  };
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    await FoodMenu.create({
      day: DAYS[i],
      date,
      breakfast: menus[i][0],
      lunch: menus[i][1],
      snacks: menus[i][2],
      dinner: menus[i][3],
      feedback: (FB[i] || []).map((f) => ({
        tenantId: tenants[f.t]._id,
        meal: f.meal,
        rating: f.r,
        comment: f.c || '',
        at: new Date(date.getTime() + 13 * 3600 * 1000),
      })),
    });
  }

  // ── Expenses — last 6 months of operating costs (keeps P&L positive) ──
  // One predictable set per month so the P&L trend reads cleanly against the
  // rising rent income seeded above.
  const expenseFor = (off) => {
    const d = new Date(cy, cm - 1 - off, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const at = (day) => new Date(y, m, day);
    const rows = [
      { category: 'salaries', amount: 54000, vendor: 'Monthly Payroll', note: 'Cook, security & maintenance staff', date: at(1) },
      { category: 'utilities', amount: 12000 + off * 800, vendor: 'State Electricity Board', note: 'Electricity + water', date: at(7) },
      { category: 'supplies', amount: 5500 + off * 200, vendor: 'Sri Sai Kirana', note: 'Kitchen & cleaning supplies', date: at(12) },
      { category: 'maintenance', amount: 3000 + (off % 3) * 2500, vendor: 'FixIt Services', note: 'Plumbing & electrical repairs', date: at(18) },
    ];
    if (off === 0 || off === 3) {
      rows.push({ category: 'marketing', amount: 2500, vendor: 'JustDial Listings', note: 'Lead generation ads', date: at(9) });
    }
    return rows;
  };
  for (const off of [5, 4, 3, 2, 1, 0]) {
    for (const r of expenseFor(off)) await Expense.create({ ...r, createdBy: admin._id });
  }

  // ── Leads — a populated CRM pipeline across every stage ───────────────
  const day = 24 * 3600 * 1000;
  const leadSpecs = [
    { name: 'Rahul Deshpande', phone: '+91 9812000001', email: 'rahul.d@example.com', source: 'website', stage: 'new', budget: 8000, note: 'Looking for a single AC room from next month.', followUpAt: new Date(Date.now() + 2 * day) },
    { name: 'Sara Thomas', phone: '+91 9812000002', email: 'sara.t@example.com', source: 'website', stage: 'new', budget: 7000, note: 'Enquired via booking page. Working professional.' },
    { name: 'Imran Sheikh', phone: '+91 9812000003', source: 'walk_in', stage: 'new', budget: 6000, note: 'Walked in asking about triple sharing.' },
    { name: 'Pooja Hegde', phone: '+91 9812000004', email: 'pooja.h@example.com', source: 'referral', stage: 'contacted', budget: 9000, note: 'Referred by current resident Priya. Called, interested.', followUpAt: new Date(Date.now() + 1 * day) },
    { name: 'Vivek Malhotra', phone: '+91 9812000005', source: 'social', stage: 'contacted', budget: 7500, note: 'Found us on Instagram. Wants a virtual tour.' },
    { name: 'Ananya Roy', phone: '+91 9812000006', email: 'ananya.r@example.com', source: 'website', stage: 'visit_scheduled', budget: 9500, note: 'Visit booked for this weekend.', followUpAt: new Date(Date.now() + 3 * day) },
    { name: 'Harsh Vardhan', phone: '+91 9812000007', source: 'referral', stage: 'visit_scheduled', budget: 7000, note: 'Coming with parents to see the property.', followUpAt: new Date(Date.now() + 4 * day) },
    { name: 'Tanvi Kapoor', phone: '+91 9812000008', email: 'tanvi.k@example.com', source: 'website', stage: 'token_paid', budget: 9000, note: 'Paid ₹2000 token to block room 201.' },
    { name: 'Manish Gupta', phone: '+91 9812000009', email: 'manish.g@example.com', source: 'walk_in', stage: 'converted', budget: 6000, note: 'Moved in last week — converted to resident.' },
    { name: 'Deepika Menon', phone: '+91 9812000010', source: 'social', stage: 'lost', budget: 5000, note: 'Chose a closer PG. Budget mismatch.' },
  ];
  for (const l of leadSpecs) await Lead.create({ ...l, createdBy: admin._id });

  // ── Move-out queue — two former residents for the settlement demo ─────
  // These are NOT counted in room occupancy; they reference a former room only
  // for display. One awaits settlement (with a deduction), one is fully closed.
  const mohit = await User.create({
    name: 'Mohit Agarwal',
    email: 'mohit.agarwal@example.com',
    phone: '+91 9000022001',
    password: 'Tenant@123',
    role: 'tenant',
    tenantProfile: {
      roomId: roomByNumber['102']._id,
      joiningDate: new Date(Date.now() - 220 * day),
      moveOutDate: new Date(Date.now() - 6 * day),
      securityDeposit: 9000,
      rentAmount: 7000,
      status: 'moved_out',
      idProof: { type: 'aadhaar', number: 'XXXX-XXXX-4821' },
      policeVerification: 'verified',
      agreementStatus: 'signed',
    },
  });
  await DepositLedger.create({
    tenantId: mohit._id,
    entries: [
      { type: 'deposit', amount: 9000, reason: 'Opening security deposit', at: new Date(Date.now() - 220 * day) },
      { type: 'deduction', amount: 1500, reason: 'Wall repainting & minor repairs', at: new Date(Date.now() - 5 * day) },
    ],
  });

  const kavya = await User.create({
    name: 'Kavya Nair',
    email: 'kavya.nair@example.com',
    phone: '+91 9000022002',
    password: 'Tenant@123',
    role: 'tenant',
    tenantProfile: {
      roomId: roomByNumber['203']._id,
      joiningDate: new Date(Date.now() - 300 * day),
      moveOutDate: new Date(Date.now() - 40 * day),
      securityDeposit: 6200,
      rentAmount: 6200,
      status: 'moved_out',
      idProof: { type: 'aadhaar', number: 'XXXX-XXXX-7733' },
      policeVerification: 'verified',
      agreementStatus: 'signed',
    },
  });
  await DepositLedger.create({
    tenantId: kavya._id,
    entries: [
      { type: 'deposit', amount: 6200, reason: 'Opening security deposit', at: new Date(Date.now() - 300 * day) },
      { type: 'refund', amount: 6200, reason: 'Move-out settlement refund', at: new Date(Date.now() - 38 * day) },
    ],
    settledAt: new Date(Date.now() - 38 * day),
  });

  console.log('🌱 Seed complete:');
  console.log('   admin@quarters.app / Admin@123');
  console.log('   tenant@quarters.app / Tenant@123');
  console.log('   staff@quarters.app / Staff@123');

  if (exitAfter) {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed({ exitAfter: true }).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
