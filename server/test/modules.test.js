import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

let mem;

const DEMO = {
  admin: { email: 'admin@quarters.app', password: 'Admin@123' },
  tenant: { email: 'tenant@quarters.app', password: 'Tenant@123' },
};

const login = (creds) => request(app).post('/api/auth/login').send(creds);
const token = async (creds) => (await login(creds)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_modules_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

// ── Expenses & P&L ────────────────────────────────────────────────────
describe('expenses & P&L', () => {
  it('rejects unauthenticated access (401)', async () => {
    expect((await request(app).get('/api/expenses')).status).toBe(401);
  });

  it('forbids a tenant (403)', async () => {
    expect((await request(app).get('/api/expenses').set(auth(tenantT))).status).toBe(403);
  });

  it('admin can create an expense (201)', async () => {
    const res = await request(app).post('/api/expenses').set(auth(adminT)).send({
      category: 'utilities', amount: 4321, vendor: 'Test Board', note: 'unit test',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.expense.amount).toBe(4321);
  });

  it('rejects an invalid category (422)', async () => {
    const res = await request(app).post('/api/expenses').set(auth(adminT)).send({
      category: 'yacht', amount: 100,
    });
    expect(res.status).toBe(422);
  });

  it('summary returns net = paid-rent income − expenses', async () => {
    const res = await request(app).get('/api/expenses/summary').set(auth(adminT));
    expect(res.status).toBe(200);
    const { income, expenses, net } = res.body.data;
    expect(typeof income).toBe('number');
    expect(typeof expenses).toBe('number');
    expect(net).toBe(income - expenses);
  });
});

// ── Leads CRM + public booking ────────────────────────────────────────
describe('leads CRM + public booking', () => {
  it('accepts an unauthenticated public booking (201, stage=new)', async () => {
    const res = await request(app).post('/api/leads/public').send({
      name: 'Walk In', phone: '+91 9000000123', note: 'from website',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.lead.stage).toBe('new');
  });

  it('rejects a public booking missing name/phone (422)', async () => {
    expect((await request(app).post('/api/leads/public').send({ note: 'x' })).status).toBe(422);
  });

  it('lead list is admin-only (tenant 403)', async () => {
    expect((await request(app).get('/api/leads').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).get('/api/leads').set(auth(adminT))).status).toBe(200);
  });

  it('admin can move a lead through the pipeline and convert it', async () => {
    const created = await request(app).post('/api/leads').set(auth(adminT)).send({
      name: 'Pipeline Lead', phone: '+91 9000000999', source: 'referral',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.lead._id;

    const moved = await request(app).patch(`/api/leads/${id}/stage`).set(auth(adminT)).send({ stage: 'contacted' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.lead.stage).toBe('contacted');

    const badStage = await request(app).patch(`/api/leads/${id}/stage`).set(auth(adminT)).send({ stage: 'nope' });
    expect(badStage.status).toBe(422);

    const conv = await request(app).post(`/api/leads/${id}/convert`).set(auth(adminT));
    expect(conv.status).toBe(200);
    expect(conv.body.data.lead.stage).toBe('converted');
    expect(conv.body.data.prefill.name).toBe('Pipeline Lead');
  });
});

// ── Deposit settlements (guards the gross-deposit refund math) ─────────
describe('deposit settlements', () => {
  it('move-out queue is admin-only and lists moved-out tenants', async () => {
    expect((await request(app).get('/api/settlements/queue').set(auth(tenantT))).status).toBe(403);
    const res = await request(app).get('/api/settlements/queue').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.queue.length).toBeGreaterThan(0);
  });

  it('computes refund = gross deposit − dues − deductions (no double count)', async () => {
    const queue = (await request(app).get('/api/settlements/queue').set(auth(adminT))).body.data.queue;
    const mohit = queue.find((t) => t.name === 'Mohit Agarwal');
    expect(mohit).toBeTruthy(); // seeded: ₹9,000 deposit, ₹1,500 deduction
    const res = await request(app).get(`/api/settlements/${mohit._id}/compute`).set(auth(adminT));
    expect(res.status).toBe(200);
    const s = res.body.data.settlement;
    expect(s.depositHeld).toBe(9000);
    expect(s.totalDeductions).toBe(1500);
    expect(s.refund).toBe(9000 - s.pendingDues - 1500);
  });

  it('adding a deduction lowers the refund, and finalize closes the ledger', async () => {
    const queue = (await request(app).get('/api/settlements/queue').set(auth(adminT))).body.data.queue;
    const mohit = queue.find((t) => t.name === 'Mohit Agarwal');
    const before = (await request(app).get(`/api/settlements/${mohit._id}/compute`).set(auth(adminT))).body.data.settlement;

    const add = await request(app).post(`/api/settlements/${mohit._id}/deductions`).set(auth(adminT)).send({ amount: 500, reason: 'broken chair' });
    expect(add.status).toBe(201);
    expect(add.body.data.settlement.refund).toBe(before.refund - 500);

    const fin = await request(app).post(`/api/settlements/${mohit._id}/finalize`).set(auth(adminT));
    expect(fin.status).toBe(200);
    expect(fin.body.data.settlementUrl).toMatch(/\.pdf$/);

    // already settled → cannot re-finalize
    expect((await request(app).post(`/api/settlements/${mohit._id}/finalize`).set(auth(adminT))).status).toBe(422);
  });
});

// ── Electricity split-billing ─────────────────────────────────────────
describe('electricity split-billing', () => {
  const room = async (num) => {
    const rooms = (await request(app).get('/api/rooms?limit=200').set(auth(adminT))).body.data.rooms;
    return rooms.find((r) => r.roomNumber === num);
  };

  it('requires roomId (400) and a positive amount (422)', async () => {
    expect((await request(app).post('/api/rents/electricity').set(auth(adminT)).send({})).status).toBe(400);
    const r101 = await room('101');
    expect((await request(app).post('/api/rents/electricity').set(auth(adminT)).send({ roomId: r101._id, amount: 0 })).status).toBe(422);
  });

  it('splits a bill across active occupants and folds it into the invoice', async () => {
    const r101 = await room('101'); // single occupant, current rent pending
    const res = await request(app).post('/api/rents/electricity').set(auth(adminT)).send({
      roomId: r101._id, units: 50, ratePerUnit: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(500);
    expect(res.body.data.occupants).toBe(1);
    expect(res.body.data.perHead).toBe(500);
    expect(res.body.data.charged).toBeGreaterThanOrEqual(1);
  });

  it('refuses a room with no active occupants (422)', async () => {
    const r302 = await room('302'); // under maintenance, unoccupied
    const res = await request(app).post('/api/rents/electricity').set(auth(adminT)).send({ roomId: r302._id, amount: 800 });
    expect(res.status).toBe(422);
  });

  it('forbids a tenant from billing electricity (403)', async () => {
    const r101 = await room('101');
    expect((await request(app).post('/api/rents/electricity').set(auth(tenantT)).send({ roomId: r101._id, amount: 100 })).status).toBe(403);
  });
});

// ── Rent receipt (lazy generation) ────────────────────────────────────
describe('rent receipt', () => {
  it('generates a receipt on demand for a paid rent, 404 for an unpaid one', async () => {
    const rents = (await request(app).get('/api/rents?limit=200').set(auth(adminT))).body.data.rents;
    const paid = rents.find((r) => r.status === 'paid');
    const unpaid = rents.find((r) => r.status !== 'paid');

    const ok = await request(app).get(`/api/rents/${paid._id}/receipt`).set(auth(adminT));
    expect(ok.status).toBe(200);
    expect(ok.body.data.receiptUrl).toMatch(/\/uploads\/receipts\/.*\.pdf$/);

    const no = await request(app).get(`/api/rents/${unpaid._id}/receipt`).set(auth(adminT));
    expect(no.status).toBe(404);
  });
});
