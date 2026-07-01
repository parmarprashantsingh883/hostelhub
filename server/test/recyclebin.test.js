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
const assets = async () => (await request(app).get('/api/assets').set(auth(adminT))).body.data.assets;
const bin = async () => (await request(app).get('/api/recyclebin').set(auth(adminT))).body.data.items;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_recyclebin_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('recycle bin', () => {
  it('deleting an asset moves it to the bin (out of the list)', async () => {
    const a = (await assets())[0];
    await request(app).delete(`/api/assets/${a._id}`).set(auth(adminT));
    expect((await assets()).some((x) => x._id === a._id)).toBe(false);
    const trashed = (await bin()).find((t) => t.type === 'Asset' && String(t.originalId) === String(a._id));
    expect(trashed).toBeTruthy();
    expect(trashed.label).toBe(a.name);
  });

  it('restore puts it back and clears it from the bin', async () => {
    const trash = (await bin()).find((t) => t.type === 'Asset');
    const res = await request(app).post(`/api/recyclebin/${trash._id}/restore`).set(auth(adminT));
    expect(res.status).toBe(200);
    expect((await assets()).some((x) => String(x._id) === String(trash.originalId))).toBe(true);
    expect((await bin()).some((t) => t._id === trash._id)).toBe(false);
  });

  it('purge deletes forever (cannot restore)', async () => {
    const a = (await assets())[0];
    await request(app).delete(`/api/assets/${a._id}`).set(auth(adminT));
    const trash = (await bin()).find((t) => String(t.originalId) === String(a._id));
    expect((await request(app).delete(`/api/recyclebin/${trash._id}`).set(auth(adminT))).status).toBe(200);
    expect((await request(app).post(`/api/recyclebin/${trash._id}/restore`).set(auth(adminT))).status).toBe(404);
  });

  it('empty bin clears everything', async () => {
    const a = (await assets())[0];
    await request(app).delete(`/api/assets/${a._id}`).set(auth(adminT));
    const res = await request(app).delete('/api/recyclebin').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.deletedCount).toBeGreaterThanOrEqual(1);
    expect((await bin()).length).toBe(0);
  });

  it('forbids a tenant (403)', async () => {
    expect((await request(app).get('/api/recyclebin').set(auth(tenantT))).status).toBe(403);
  });
});
