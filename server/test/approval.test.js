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
let raisedId;
const now = new Date();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_approval_test'));
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

describe('approvals workflow', () => {
  it('staff raises a request (pending)', async () => {
    const res = await request(app).post('/api/approvals').set(auth(staffT)).send({ type: 'purchase', title: 'Replacement kettle', amount: 5000, expenseCategory: 'supplies', reason: 'Old one broke' });
    expect(res.status).toBe(201);
    expect(res.body.data.approval.status).toBe('pending');
    raisedId = res.body.data.approval._id;
  });

  it('staff sees only their own; admin sees all', async () => {
    const staffList = (await request(app).get('/api/approvals').set(auth(staffT))).body.data.approvals;
    const adminList = (await request(app).get('/api/approvals').set(auth(adminT))).body.data.approvals;
    expect(adminList.length).toBeGreaterThan(staffList.length);
  });

  it('forbids a tenant entirely (403) and staff from deciding (403)', async () => {
    expect((await request(app).get('/api/approvals').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).put(`/api/approvals/${raisedId}/decision`).set(auth(staffT)).send({ decision: 'approved' })).status).toBe(403);
  });

  it('admin approves an expense request → posts it to P&L', async () => {
    const res = await request(app).put(`/api/approvals/${raisedId}/decision`).set(auth(adminT)).send({ decision: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.approval.status).toBe('approved');
    expect(res.body.data.approval.expenseId).toBeTruthy();

    const exp = (await request(app).get('/api/expenses').set(auth(adminT)).query({ month: now.getMonth() + 1, year: now.getFullYear() })).body.data.expenses;
    expect(exp.some((e) => e.note === 'Approved: Replacement kettle' && e.amount === 5000)).toBe(true);
  });

  it('a decided request cannot be decided again (409)', async () => {
    const res = await request(app).put(`/api/approvals/${raisedId}/decision`).set(auth(adminT)).send({ decision: 'rejected' });
    expect(res.status).toBe(409);
  });

  it('admin rejects a pending request with a note', async () => {
    const pending = (await request(app).get('/api/approvals').set(auth(adminT)).query({ status: 'pending' })).body.data.approvals[0];
    const res = await request(app).put(`/api/approvals/${pending._id}/decision`).set(auth(adminT)).send({ decision: 'rejected', note: 'Not this month' });
    expect(res.status).toBe(200);
    expect(res.body.data.approval.status).toBe('rejected');
    expect(res.body.data.approval.decisionNote).toBe('Not this month');
  });
});
