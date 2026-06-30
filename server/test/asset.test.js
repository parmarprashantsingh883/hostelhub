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
  await mongoose.connect(mem.getUri('quarters_asset_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('asset register', () => {
  it('lists assets with register KPIs', async () => {
    const res = await request(app).get('/api/assets').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.assets.length).toBeGreaterThan(0);
    expect(res.body.data.kpis.totalValue).toBeGreaterThan(0);
    expect(res.body.data.kpis.underRepair).toBeGreaterThanOrEqual(1);
  });

  it('filters by status', async () => {
    const res = await request(app).get('/api/assets').set(auth(adminT)).query({ status: 'under_repair' });
    expect(res.status).toBe(200);
    expect(res.body.data.assets.every((a) => a.status === 'under_repair')).toBe(true);
    expect(res.body.data.assets.length).toBeGreaterThan(0);
  });

  it('creates, updates and deletes an asset (admin)', async () => {
    const created = await request(app).post('/api/assets').set(auth(adminT)).send({ name: 'Test heater', category: 'appliance', condition: 'new', purchaseCost: 2500 });
    expect(created.status).toBe(201);
    const id = created.body.data.asset._id;

    const upd = await request(app).put(`/api/assets/${id}`).set(auth(adminT)).send({ status: 'under_repair', condition: 'damaged' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.asset.status).toBe('under_repair');

    const del = await request(app).delete(`/api/assets/${id}`).set(auth(adminT));
    expect(del.status).toBe(200);
  });

  it('rejects an invalid category (422)', async () => {
    const res = await request(app).post('/api/assets').set(auth(adminT)).send({ name: 'X', category: 'spaceship' });
    expect(res.status).toBe(422);
  });

  it('forbids a tenant (403)', async () => {
    expect((await request(app).get('/api/assets').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).post('/api/assets').set(auth(tenantT)).send({ name: 'X' })).status).toBe(403);
  });
});
