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

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_saasux_test'));
  await runSeed({ exitAfter: false });
  adminT = await token({ email: 'admin@quarters.app', password: 'Admin@123' });
}, 120000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('global search (⌘K)', () => {
  it('short queries return nothing', async () => {
    const res = await request(app).get('/api/search?q=a').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });

  it('finds a seeded room by number', async () => {
    const res = await request(app).get('/api/search?q=101').set(auth(adminT));
    expect(res.status).toBe(200);
    const room = res.body.data.results.find((r) => r.type === 'room');
    expect(room).toBeTruthy();
    expect(room.to).toBe('/admin/rooms');
  });

  it('finds a resident by name across types', async () => {
    const res = await request(app).get('/api/search?q=demo').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.results.length).toBeGreaterThan(0);
    expect(res.body.data.results.every((r) => r.title && r.type && r.to)).toBe(true);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/search?q=room')).status).toBe(401);
  });
});

describe('onboarding checklist', () => {
  it('reports real setup progress for the seeded org', async () => {
    const res = await request(app).get('/api/dashboard/onboarding').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.steps.find((s) => s.key === 'rooms').done).toBe(true); // seed has rooms
    expect(res.body.data.percent).toBeGreaterThan(0);
  });

  it('can be dismissed', async () => {
    expect((await request(app).post('/api/dashboard/onboarding/dismiss').set(auth(adminT))).status).toBe(200);
    const res = await request(app).get('/api/dashboard/onboarding').set(auth(adminT));
    expect(res.body.data.dismissed).toBe(true);
  });

  it('is admin-only', async () => {
    const staffT = await token({ email: 'staff@quarters.app', password: 'Staff@123' });
    expect((await request(app).get('/api/dashboard/onboarding').set(auth(staffT))).status).toBe(403);
  });
});

describe('activity feed', () => {
  it('returns a merged, time-sorted feed', async () => {
    const res = await request(app).get('/api/dashboard/activity').set(auth(adminT));
    expect(res.status).toBe(200);
    const items = res.body.data.items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.text && i.at && i.type)).toBe(true);
    // sorted newest-first
    for (let i = 1; i < items.length; i++) {
      expect(new Date(items[i - 1].at) >= new Date(items[i].at)).toBe(true);
    }
  });
});
