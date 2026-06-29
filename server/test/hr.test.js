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
let staffId;
const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const M = now.getMonth() + 1;
const Y = now.getFullYear();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_hr_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  staffT = await token(DEMO.staff);
  tenantT = await token(DEMO.tenant);
  staffId = (await request(app).get('/api/staff').set(auth(adminT))).body.data.staff[0]._id;
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('attendance', () => {
  it('marks attendance for a day', async () => {
    const res = await request(app).post('/api/attendance').set(auth(adminT)).send({ staffId, date: today, status: 'absent', shift: 'night' });
    expect(res.status).toBe(200);
    expect(res.body.data.record.status).toBe('absent');
  });

  it('re-marking the same day upserts (no duplicate)', async () => {
    await request(app).post('/api/attendance').set(auth(adminT)).send({ staffId, date: today, status: 'present', shift: 'general' });
    const recs = (await request(app).get('/api/attendance').set(auth(adminT)).query({ date: today })).body.data.records;
    const mine = recs.filter((r) => String(r.staffId?._id || r.staffId) === String(staffId));
    expect(mine.length).toBe(1);
    expect(mine[0].status).toBe('present');
  });

  it('summary returns per-staff counts', async () => {
    const res = await request(app).get('/api/attendance/summary').set(auth(adminT)).query({ month: M, year: Y });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.summary)).toBe(true);
    expect(res.body.data.summary.length).toBeGreaterThan(0);
  });

  it('forbids tenant + staff (admin-only)', async () => {
    expect((await request(app).get('/api/attendance').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).get('/api/attendance').set(auth(staffT))).status).toBe(403);
  });
});

describe('payroll', () => {
  it('lists payroll rows with salary', async () => {
    const res = await request(app).get('/api/payroll').set(auth(adminT)).query({ month: M, year: Y });
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
    expect(res.body.data.totalSalary).toBeGreaterThan(0);
  });

  it('running payroll logs a salaries expense; second run is blocked (409)', async () => {
    const res = await request(app).post('/api/payroll/run').set(auth(adminT)).send({ staffId, month: M, year: Y });
    expect(res.status).toBe(201);
    expect(res.body.data.payroll.expenseId).toBeTruthy();

    const exp = (await request(app).get('/api/expenses').set(auth(adminT)).query({ month: M, year: Y })).body.data.expenses;
    expect(exp.some((e) => e.category === 'salaries' && /^Salary/.test(e.note || ''))).toBe(true);

    const again = await request(app).post('/api/payroll/run').set(auth(adminT)).send({ staffId, month: M, year: Y });
    expect(again.status).toBe(409);
  });
});
