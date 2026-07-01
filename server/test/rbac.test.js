import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

let mem;
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let ganeshT; // security staff — seeded with only visitors.manage
let ganeshId;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_rbac_test'));
  await runSeed({ exitAfter: false });
  adminT = await token({ email: 'admin@quarters.app', password: 'Admin@123' });
  ganeshT = await token({ email: 'ganesh@example.com', password: 'Staff@123' });
  const staff = (await request(app).get('/api/staff').set(auth(adminT))).body.data.staff;
  ganeshId = staff.find((s) => s.email === 'ganesh@example.com')._id;
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('granular staff RBAC', () => {
  it('exposes the permission catalog (admin)', async () => {
    const res = await request(app).get('/api/staff/permissions').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.permissions.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.permissions.map((p) => p.key)).toContain('maintenance.manage');
  });

  it('blocks a staff action the member lacks permission for (403)', async () => {
    // Ganesh has visitors.manage but NOT maintenance.manage
    const res = await request(app).post('/api/work-orders').set(auth(ganeshT)).send({ title: 'Fix a thing' });
    expect(res.status).toBe(403);
  });

  it('admin grant unlocks the action for the same staff member', async () => {
    const grant = await request(app).put(`/api/staff/${ganeshId}/permissions`).set(auth(adminT)).send({ permissions: ['visitors.manage', 'maintenance.manage'] });
    expect(grant.status).toBe(200);
    // same token — protect re-reads permissions each request
    const res = await request(app).post('/api/work-orders').set(auth(ganeshT)).send({ title: 'Fix a thing' });
    expect(res.status).toBe(201);
  });

  it('admin is never blocked by permissions (bypass)', async () => {
    const res = await request(app).post('/api/work-orders').set(auth(adminT)).send({ title: 'Admin job' });
    expect(res.status).toBe(201);
  });

  it('unknown permission keys are filtered out', async () => {
    const res = await request(app).put(`/api/staff/${ganeshId}/permissions`).set(auth(adminT)).send({ permissions: ['visitors.manage', 'fly.helicopter'] });
    expect(res.status).toBe(200);
    expect(res.body.data.staff.staffProfile.permissions).toEqual(['visitors.manage']);
  });

  it('staff cannot edit permissions (admin-only, 403)', async () => {
    const res = await request(app).put(`/api/staff/${ganeshId}/permissions`).set(auth(ganeshT)).send({ permissions: [] });
    expect(res.status).toBe(403);
  });
});
