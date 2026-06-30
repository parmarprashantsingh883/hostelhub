import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

let mem;
const DEMO = { admin: { email: 'admin@quarters.app', password: 'Admin@123' }, tenant: { email: 'tenant@quarters.app', password: 'Tenant@123' } };
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_agreement_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('agreements / e-sign', () => {
  it('admin generates & sends an agreement (PDF)', async () => {
    const tenants = (await request(app).get('/api/tenants').set(auth(adminT)).query({ limit: 50 })).body.data.tenants;
    const other = tenants.find((t) => t.email !== DEMO.tenant.email) || tenants[0];
    const res = await request(app).post('/api/agreements').set(auth(adminT)).send({ tenantId: other._id, durationMonths: 11, dueDay: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.agreement.status).toBe('sent');
    expect(res.body.data.agreement.pdfUrl).toMatch(/^\/uploads\/agreements\//);
  });

  it('tenant fetches their own agreement', async () => {
    const res = await request(app).get('/api/agreements/me').set(auth(tenantT));
    expect(res.status).toBe(200);
    expect(res.body.data.agreement).toBeTruthy();
  });

  it('tenant e-signs; signing again is blocked (409)', async () => {
    const mine = (await request(app).get('/api/agreements/me').set(auth(tenantT))).body.data.agreement;
    const res = await request(app).put(`/api/agreements/${mine._id}/sign`).set(auth(tenantT)).send({ signerName: 'Demo Tenant' });
    expect(res.status).toBe(200);
    expect(res.body.data.agreement.status).toBe('signed');
    expect(res.body.data.agreement.signerName).toBe('Demo Tenant');

    const me2 = await request(app).get('/api/agreements/me').set(auth(tenantT));
    expect(me2.body.data.agreement.status).toBe('signed');

    const again = await request(app).put(`/api/agreements/${mine._id}/sign`).set(auth(tenantT)).send({ signerName: 'Demo Tenant' });
    expect(again.status).toBe(409);
  });

  it('admin cannot e-sign (tenant-only) and tenant cannot list all (admin-only)', async () => {
    const any = (await request(app).get('/api/agreements').set(auth(adminT))).body.data.agreements[0];
    expect((await request(app).put(`/api/agreements/${any._id}/sign`).set(auth(adminT)).send({})).status).toBe(403);
    expect((await request(app).get('/api/agreements').set(auth(tenantT))).status).toBe(403);
  });
});
