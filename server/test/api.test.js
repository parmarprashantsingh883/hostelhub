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
  staff: { email: 'staff@quarters.app', password: 'Staff@123' },
};

const login = (creds) => request(app).post('/api/auth/login').send(creds);
const token = async (creds) => (await login(creds)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_test'));
  await runSeed({ exitAfter: false });
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('health', () => {
  it('GET /api/health → 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('unknown route → 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('auth', () => {
  it('logs in a valid admin and returns a token + role', async () => {
    const res = await login(DEMO.admin);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
  });

  it('never returns the password hash', async () => {
    const res = await login(DEMO.admin);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects a wrong password (401)', async () => {
    const res = await login({ email: DEMO.admin.email, password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email (401)', async () => {
    const res = await login({ email: 'ghost@nowhere.com', password: 'whatever1' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me requires authentication (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns the current user when authed', async () => {
    const t = await token(DEMO.admin);
    const res = await request(app).get('/api/auth/me').set(auth(t));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(DEMO.admin.email);
  });

  it('refresh works via the http-only cookie and fails without it', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(DEMO.tenant);
    const ok = await agent.post('/api/auth/refresh');
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeTruthy();

    const noCookie = await request(app).post('/api/auth/refresh');
    expect(noCookie.status).toBe(401);
  });

  it('public registration creates a tenant account', async () => {
    const email = `newuser_${Date.now()}@test.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email, phone: '+91 9000012345', password: 'Test@12345',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('tenant');
    // and can immediately log in
    const li = await login({ email, password: 'Test@12345' });
    expect(li.status).toBe(200);
  });

  it('rejects duplicate registration email (409)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dupe', email: DEMO.admin.email, phone: '+91 9000099999', password: 'Test@12345',
    });
    expect(res.status).toBe(409);
  });

  it('validates registration input (422 on short password)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X', email: `x_${Date.now()}@test.com`, phone: '+91 9', password: '123',
    });
    expect(res.status).toBe(422);
  });
});

describe('rooms + RBAC', () => {
  it('GET /api/rooms requires auth (401)', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('GET /api/rooms returns the seeded rooms for an authed user', async () => {
    const t = await token(DEMO.admin);
    const res = await request(app).get('/api/rooms').set(auth(t));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.rooms)).toBe(true);
    expect(res.body.data.rooms.length).toBeGreaterThan(0);
  });

  it('admin can create a room (201)', async () => {
    const t = await token(DEMO.admin);
    const res = await request(app).post('/api/rooms').set(auth(t)).send({
      roomNumber: `T-${Date.now()}`, floor: 4, roomType: 'single', capacity: 1, rentAmount: 8000,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.room.roomNumber).toMatch(/^T-/);
  });

  it('a tenant is FORBIDDEN from creating a room (403)', async () => {
    const t = await token(DEMO.tenant);
    const res = await request(app).post('/api/rooms').set(auth(t)).send({
      roomNumber: `H-${Date.now()}`, floor: 1, roomType: 'single', capacity: 1, rentAmount: 5000,
    });
    expect(res.status).toBe(403);
  });

  it('rejects invalid room input (422)', async () => {
    const t = await token(DEMO.admin);
    const res = await request(app).post('/api/rooms').set(auth(t)).send({
      roomNumber: '', floor: -5, roomType: 'palace', capacity: 0, rentAmount: -1,
    });
    expect(res.status).toBe(422);
  });
});

describe('protected resources', () => {
  it('GET /api/rents requires auth (401) and works for admin (200)', async () => {
    expect((await request(app).get('/api/rents')).status).toBe(401);
    const t = await token(DEMO.admin);
    const res = await request(app).get('/api/rents').set(auth(t));
    expect(res.status).toBe(200);
  });

  it('GET /api/dashboard/admin is admin-only', async () => {
    const tenantT = await token(DEMO.tenant);
    expect((await request(app).get('/api/dashboard/admin').set(auth(tenantT))).status).toBe(403);
    const adminT = await token(DEMO.admin);
    expect((await request(app).get('/api/dashboard/admin').set(auth(adminT))).status).toBe(200);
  });

  it('GET /api/notices works for any authed role', async () => {
    const t = await token(DEMO.staff);
    const res = await request(app).get('/api/notices').set(auth(t));
    expect(res.status).toBe(200);
  });
});
