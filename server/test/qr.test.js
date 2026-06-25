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
  await mongoose.connect(mem.getUri('quarters_qr_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

// ── UPI scan-to-pay ────────────────────────────────────────────────────
describe('UPI scan-to-pay QR', () => {
  let unpaidRentId;

  beforeAll(async () => {
    // Generate a future-month rent so the demo tenant has a guaranteed unpaid one.
    await request(app).post('/api/rents/generate').set(auth(adminT)).send({ month: 12, year: 2031, dueDay: 5 });
    const res = await request(app).get('/api/rents').set(auth(tenantT)).query({ month: 12, year: 2031 });
    unpaidRentId = res.body.data.rents[0]?._id;
  });

  it('returns a UPI intent for an unpaid rent (dev demo VPA)', async () => {
    const res = await request(app).get(`/api/rents/${unpaidRentId}/upi`).set(auth(tenantT));
    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(true);
    expect(res.body.data.intent).toMatch(/^upi:\/\/pay\?pa=/);
    expect(res.body.data.intent).toContain('cu=INR');
    expect(res.body.data.intent).toContain(`tr=${unpaidRentId}`);
  });

  it('rejects unauthenticated access (401)', async () => {
    expect((await request(app).get(`/api/rents/${unpaidRentId}/upi`)).status).toBe(401);
  });

  it('forbids a non-owner / non-tenant (403)', async () => {
    expect((await request(app).get(`/api/rents/${unpaidRentId}/upi`).set(auth(adminT))).status).toBe(403);
  });
});

// ── Visitor QR pass check-in ───────────────────────────────────────────
describe('visitor QR pass check-in', () => {
  let passCode;

  beforeAll(async () => {
    const res = await request(app).post('/api/visitors').set(auth(tenantT)).send({
      visitorName: 'QR Test Guest',
      visitorPhone: '9000000000',
      purpose: 'unit test pass',
      expectedDateTime: new Date().toISOString(),
    });
    passCode = res.body.data.visitor.passCode;
  });

  it('issues a pass code on visitor creation', () => {
    expect(passCode).toMatch(/^QV-[0-9A-F]{6}$/);
  });

  it('staff/admin can check in by pass code (200 → checked_in)', async () => {
    const res = await request(app).post('/api/visitors/check-in-by-code').set(auth(adminT)).send({ code: passCode });
    expect(res.status).toBe(200);
    expect(res.body.data.visitor.status).toBe('checked_in');
  });

  it('rejects re-using an already-used pass (422)', async () => {
    const res = await request(app).post('/api/visitors/check-in-by-code').set(auth(adminT)).send({ code: passCode });
    expect(res.status).toBe(422);
  });

  it('404 for an unknown pass code', async () => {
    const res = await request(app).post('/api/visitors/check-in-by-code').set(auth(adminT)).send({ code: 'QV-ZZZZZZ' });
    expect(res.status).toBe(404);
  });

  it('forbids a tenant from checking visitors in (403)', async () => {
    const res = await request(app).post('/api/visitors/check-in-by-code').set(auth(tenantT)).send({ code: passCode });
    expect(res.status).toBe(403);
  });
});

// ── Public receipt verification ────────────────────────────────────────
describe('public receipt verification', () => {
  let paidRentId;

  beforeAll(async () => {
    const res = await request(app).get('/api/rents').set(auth(adminT)).query({ status: 'paid', limit: 1 });
    paidRentId = res.body.data.rents[0]?._id;
  });

  it('verifies a genuine paid receipt without auth (valid:true)', async () => {
    const res = await request(app).get(`/api/public/verify/${paidRentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.receiptNo).toMatch(/^HH-/);
    // Tenant name must be masked (no full surname leaked).
    expect(res.body.data.tenant).toMatch(/\w+\s\w\./);
  });

  it('returns valid:false for a bogus id (no 500)', async () => {
    const res = await request(app).get('/api/public/verify/not-a-real-id');
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });
});
