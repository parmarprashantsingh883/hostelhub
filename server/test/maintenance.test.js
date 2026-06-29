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
  await mongoose.connect(mem.getUri('quarters_maint_test'));
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

describe('vendors', () => {
  it('admin creates a vendor (201)', async () => {
    const res = await request(app).post('/api/vendors').set(auth(adminT)).send({ name: 'Test Carpenter', category: 'carpentry', phone: '+91 9000000123' });
    expect(res.status).toBe(201);
    expect(res.body.data.vendor.name).toBe('Test Carpenter');
  });
  it('lists vendors (seed + created)', async () => {
    const res = await request(app).get('/api/vendors').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.vendors.length).toBeGreaterThan(1);
  });
  it('forbids a tenant from creating a vendor (403)', async () => {
    expect((await request(app).post('/api/vendors').set(auth(tenantT)).send({ name: 'X' })).status).toBe(403);
  });
});

describe('work orders', () => {
  let woId;
  let complaintId;

  it('creates a standalone work order (201, open)', async () => {
    const res = await request(app).post('/api/work-orders').set(auth(adminT)).send({ title: 'Service the water pump', category: 'plumbing', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.workOrder.status).toBe('open');
  });

  it('raises a work order from a complaint (prefills title + links)', async () => {
    const complaints = (await request(app).get('/api/complaints').set(auth(adminT))).body.data.complaints;
    const c = complaints.find((x) => x.status !== 'resolved' && x.status !== 'rejected');
    complaintId = c._id;
    const res = await request(app).post('/api/work-orders').set(auth(adminT)).send({ complaintId });
    expect(res.status).toBe(201);
    expect(res.body.data.workOrder.title).toBe(c.title);
    expect(res.body.data.workOrder.complaintId._id || res.body.data.workOrder.complaintId).toBeTruthy();
    woId = res.body.data.workOrder._id;
  });

  it('lists work orders with per-status counts', async () => {
    const res = await request(app).get('/api/work-orders').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toHaveProperty('open');
    expect(res.body.data.counts).toHaveProperty('completed');
  });

  it('completing logs a maintenance expense and resolves the linked complaint', async () => {
    const res = await request(app).put(`/api/work-orders/${woId}/status`).set(auth(adminT)).send({ status: 'completed', cost: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.data.workOrder.status).toBe('completed');
    expect(res.body.data.workOrder.expenseId).toBeTruthy();

    // Expense posted to P&L
    const exp = (await request(app).get('/api/expenses').set(auth(adminT))).body.data.expenses;
    expect(exp.some((e) => e.note?.startsWith('Work order:') && e.amount === 1500)).toBe(true);

    // Linked complaint resolved
    const complaints = (await request(app).get('/api/complaints').set(auth(adminT))).body.data.complaints;
    expect(complaints.find((c) => c._id === complaintId)?.status).toBe('resolved');
  });

  it('staff can create a work order (201)', async () => {
    expect((await request(app).post('/api/work-orders').set(auth(staffT)).send({ title: 'Staff job' })).status).toBe(201);
  });

  it('forbids a tenant from listing work orders (403)', async () => {
    expect((await request(app).get('/api/work-orders').set(auth(tenantT))).status).toBe(403);
  });
});
