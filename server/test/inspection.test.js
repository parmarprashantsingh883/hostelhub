import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

let mem;
const DEMO = {
  admin: { email: 'admin@quarters.app', password: 'Admin@123' },
  staff: { email: 'staff@quarters.app', password: 'Staff@123' },
  tenant: { email: 'tenant@quarters.app', password: 'Tenant@123' },
};
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let staffT;
let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_inspection_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  staffT = await token(DEMO.staff);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('inspections', () => {
  it('creates a move-in inspection with the default checklist (draft)', async () => {
    const tenantId = (await request(app).get('/api/tenants').set(auth(adminT))).body.data.tenants[0]._id;
    const res = await request(app).post('/api/inspections').set(auth(adminT)).send({ type: 'move_in', tenantId });
    expect(res.status).toBe(201);
    expect(res.body.data.inspection.status).toBe('draft');
    expect(res.body.data.inspection.items.length).toBeGreaterThanOrEqual(8);
  });

  it('staff can create, tenant cannot (403)', async () => {
    const tenantId = (await request(app).get('/api/tenants').set(auth(adminT))).body.data.tenants[0]._id;
    expect((await request(app).post('/api/inspections').set(auth(staffT)).send({ type: 'move_in', tenantId })).status).toBe(201);
    expect((await request(app).get('/api/inspections').set(auth(tenantT))).status).toBe(403);
  });

  it('completing a move-out inspection posts deductions to the deposit ledger', async () => {
    // a moved-out tenant whose settlement is not yet finalised
    const queue = (await request(app).get('/api/settlements/queue').set(auth(adminT))).body.data.queue;
    const target = queue.find((q) => !q.settledAt);
    expect(target).toBeTruthy();

    const before = (await request(app).get(`/api/settlements/${target._id}`).set(auth(adminT))).body.data.settlement.totalDeductions;

    const insp = (await request(app).post('/api/inspections').set(auth(adminT)).send({ type: 'move_out', tenantId: target._id })).body.data.inspection;
    const items = insp.items.map((i, idx) => (idx === 0 ? { ...i, condition: 'damaged', deduction: 500, note: 'cracked' } : i));
    await request(app).put(`/api/inspections/${insp._id}`).set(auth(adminT)).send({ items });

    const done = await request(app).put(`/api/inspections/${insp._id}/complete`).set(auth(adminT));
    expect(done.status).toBe(200);
    expect(done.body.data.postedToLedger).toBe(true);
    expect(done.body.data.inspection.status).toBe('completed');

    const after = (await request(app).get(`/api/settlements/${target._id}`).set(auth(adminT))).body.data.settlement;
    expect(after.totalDeductions).toBe(before + 500);
    expect(after.deductions.some((d) => /Move-out:/.test(d.reason))).toBe(true);
  });

  it('a completed inspection cannot be edited (422)', async () => {
    const tenantId = (await request(app).get('/api/tenants').set(auth(adminT))).body.data.tenants[0]._id;
    const insp = (await request(app).post('/api/inspections').set(auth(adminT)).send({ type: 'move_in', tenantId })).body.data.inspection;
    await request(app).put(`/api/inspections/${insp._id}/complete`).set(auth(adminT));
    const res = await request(app).put(`/api/inspections/${insp._id}`).set(auth(adminT)).send({ overallNote: 'late edit' });
    expect(res.status).toBe(422);
  });
});
