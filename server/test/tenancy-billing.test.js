import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';
import Organization from '../src/models/Organization.js';
import { invalidateOrgCache } from '../src/middleware/subscription.middleware.js';

let mem;
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let orgAToken; // seeded demo org (sunrise-pg)
let orgBToken; // fresh org registered through the public SaaS signup
let orgBId;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_tenancy_test'));
  await runSeed({ exitAfter: false });
  orgAToken = await token({ email: 'admin@quarters.app', password: 'Admin@123' });

  const reg = await request(app).post('/api/auth/register').send({
    hostelName: 'Moonlight Hostel',
    name: 'Meera Owner',
    email: 'meera@moonlight.test',
    phone: '+91 9111111111',
    password: 'Owner@123',
  });
  expect(reg.status).toBe(201);
  orgBId = reg.body.data.organization._id;
  orgBToken = reg.body.data.accessToken;
}, 120000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('multi-tenancy isolation', () => {
  it('a new org starts empty — cannot see the demo org data', async () => {
    const rooms = await request(app).get('/api/rooms').set(auth(orgBToken));
    expect(rooms.status).toBe(200);
    expect(rooms.body.data.rooms).toHaveLength(0);
  });

  it('room numbers are unique per org, not globally', async () => {
    // The demo org already has room 101 — org B can use the same number.
    const res = await request(app).post('/api/rooms').set(auth(orgBToken)).send({
      roomNumber: '101', floor: 1, roomType: 'single', capacity: 1, rentAmount: 8000,
    });
    expect(res.status).toBe(201);
  });

  it("org A cannot fetch org B's room by id (404)", async () => {
    const bRooms = await request(app).get('/api/rooms').set(auth(orgBToken));
    const roomId = bRooms.body.data.rooms[0]._id;
    const res = await request(app).get(`/api/rooms/${roomId}`).set(auth(orgAToken));
    expect(res.status).toBe(404);
  });

  it('settings are isolated per org', async () => {
    const upd = await request(app).put('/api/settings').set(auth(orgBToken))
      .send({ business: { name: 'Moonlight Hostel' } });
    expect(upd.status).toBe(200);
    const a = await request(app).get('/api/settings').set(auth(orgAToken));
    expect(a.body.data.settings.business.name).not.toBe('Moonlight Hostel');
  });

  it('dashboards stay org-scoped (org B sees zero residents)', async () => {
    const res = await request(app).get('/api/dashboard/admin').set(auth(orgBToken));
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    // seeded demo residents must not bleed into org B's dashboard
    expect(body).not.toContain('tenant@quarters.app');
  });

  it('public enquiry links carry the org slug', async () => {
    const ok = await request(app).post('/api/leads/public?org=sunrise-pg').send({
      name: 'Walk-in Lead', phone: '+91 9222222222',
    });
    expect(ok.status).toBe(201);

    const missing = await request(app).post('/api/leads/public').send({
      name: 'Lost Lead', phone: '+91 9333333333',
    });
    expect(missing.status).toBe(400);

    const unknown = await request(app).post('/api/leads/public?org=no-such-pg').send({
      name: 'Ghost Lead', phone: '+91 9444444444',
    });
    expect(unknown.status).toBe(404);

    // the lead landed in org A (sunrise-pg), not org B
    const aLeads = await request(app).get('/api/leads').set(auth(orgAToken));
    expect(JSON.stringify(aLeads.body)).toContain('Walk-in Lead');
    const bLeads = await request(app).get('/api/leads').set(auth(orgBToken));
    expect(JSON.stringify(bLeads.body)).not.toContain('Walk-in Lead');
  });
});

describe('SaaS billing lifecycle', () => {
  it('exposes the public plan catalog', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.plans.map((p) => p.id)).toEqual(['starter', 'pro', 'business']);
    expect(res.body.data.trialDays).toBeGreaterThan(0);
  });

  it('a fresh org is trialing with live usage numbers', async () => {
    const res = await request(app).get('/api/billing').set(auth(orgBToken));
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('trialing');
    expect(res.body.data.daysLeft).toBeGreaterThan(0);
    expect(res.body.data.usage.rooms.used).toBe(1);
  });

  it('billing is admin-only', async () => {
    const staffToken = await token({ email: 'staff@quarters.app', password: 'Staff@123' });
    const res = await request(app).get('/api/billing').set(auth(staffToken));
    expect(res.status).toBe(403);
  });

  it('mock checkout → activate upgrades the plan', async () => {
    const co = await request(app).post('/api/billing/checkout').set(auth(orgBToken))
      .send({ planId: 'starter', cycle: 'monthly' });
    expect(co.status).toBe(200);
    expect(co.body.data.mode).toBe('mock');
    expect(co.body.data.amount).toBeGreaterThan(0);

    const act = await request(app).post('/api/billing/activate').set(auth(orgBToken)).send({
      planId: 'starter', cycle: 'monthly',
      orderId: co.body.data.order.id, paymentId: 'pay_mock_1', signature: 'mock',
    });
    expect(act.status).toBe(200);
    expect(act.body.data.subscription.status).toBe('active');
    expect(act.body.data.subscription.planId).toBe('starter');

    const sum = await request(app).get('/api/billing').set(auth(orgBToken));
    expect(sum.body.data.state).toBe('active');
    expect(sum.body.data.plan.id).toBe('starter');
  });

  it('plan limits block creation beyond the cap (402)', async () => {
    // Starter allows 15 rooms; org B already has 1.
    for (let i = 2; i <= 15; i++) {
      const r = await request(app).post('/api/rooms').set(auth(orgBToken)).send({
        roomNumber: `R${i}`, floor: 1, roomType: 'single', capacity: 1, rentAmount: 5000,
      });
      expect(r.status).toBe(201);
    }
    const over = await request(app).post('/api/rooms').set(auth(orgBToken)).send({
      roomNumber: 'R16', floor: 1, roomType: 'single', capacity: 1, rentAmount: 5000,
    });
    expect(over.status).toBe(402);
    expect(over.body.message).toMatch(/upgrade/i);
  });

  it('a lapsed subscription freezes writes but not reads or billing', async () => {
    await Organization.findByIdAndUpdate(orgBId, {
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': new Date(Date.now() - 30 * 86400000),
    });
    invalidateOrgCache(orgBId); // direct DB write bypasses the controllers

    const write = await request(app).post('/api/notices').set(auth(orgBToken))
      .send({ title: 'Frozen', content: 'Should not post' });
    expect(write.status).toBe(402);

    const read = await request(app).get('/api/rooms').set(auth(orgBToken));
    expect(read.status).toBe(200);

    // the renewal path must stay open
    const co = await request(app).post('/api/billing/checkout').set(auth(orgBToken))
      .send({ planId: 'pro', cycle: 'monthly' });
    expect(co.status).toBe(200);
  });

  it('cancel keeps access until the period ends', async () => {
    // re-activate first (previous test lapsed the org)
    const co = await request(app).post('/api/billing/checkout').set(auth(orgBToken))
      .send({ planId: 'pro', cycle: 'monthly' });
    const act = await request(app).post('/api/billing/activate').set(auth(orgBToken)).send({
      planId: 'pro', cycle: 'monthly',
      orderId: co.body.data.order.id, paymentId: 'pay_mock_2', signature: 'mock',
    });
    expect(act.status).toBe(200);

    const res = await request(app).post('/api/billing/cancel').set(auth(orgBToken));
    expect(res.status).toBe(200);
    expect(res.body.data.subscription.cancelAtPeriodEnd).toBe(true);
    expect(res.body.data.state).toBe('active'); // paid period honored

    const write = await request(app).post('/api/notices').set(auth(orgBToken))
      .send({ title: 'Still works', content: 'Until period end' });
    expect(write.status).toBe(201);
  });
});
