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
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_settings_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('settings', () => {
  it('admin reads settings (seeded defaults)', async () => {
    const res = await request(app).get('/api/settings').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.settings.business.name).toBeTruthy();
    expect(res.body.data.settings.currency).toBe('INR');
    expect(res.body.data.settings.rent.dueDay).toBeGreaterThan(0);
  });

  it('admin updates settings (round-trips)', async () => {
    const res = await request(app).put('/api/settings').set(auth(adminT)).send({
      business: { name: 'Sunrise PG' },
      rent: { dueDay: 10 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.business.name).toBe('Sunrise PG');
    expect(res.body.data.settings.rent.dueDay).toBe(10);
    const reread = await request(app).get('/api/settings').set(auth(adminT));
    expect(reread.body.data.settings.rent.dueDay).toBe(10);
  });

  it('the tenant UPI QR reads the configured VPA from settings', async () => {
    await request(app).put('/api/settings').set(auth(adminT)).send({
      payments: { upiVpa: 'mypg@okhdfc', upiPayeeName: 'My PG' },
    });
    const rents = (await request(app).get('/api/rents').set(auth(tenantT))).body.data.rents;
    const unpaid = rents.find((r) => r.status !== 'paid');
    const upi = await request(app).get(`/api/rents/${unpaid._id}/upi`).set(auth(tenantT));
    expect(upi.status).toBe(200);
    expect(upi.body.data.intent).toContain(`pa=${encodeURIComponent('mypg@okhdfc')}`);
  });

  it('forbids a tenant (403) and blocks anon (401)', async () => {
    expect((await request(app).get('/api/settings').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).get('/api/settings')).status).toBe(401);
  });
});
