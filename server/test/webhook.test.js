import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';
import Organization from '../src/models/Organization.js';

let mem;
const SECRET = 'whsec_test_secret';
const sign = (raw) => crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
const post = (raw, sig) =>
  request(app).post('/api/billing/webhook').set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sig).send(raw);

let orgId;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_webhook_test'));
  await runSeed({ exitAfter: false });
  const reg = await request(app).post('/api/auth/register').send({
    hostelName: 'Webhook PG', name: 'WH Owner', email: 'wh@test.com', phone: '+91 9000000000', password: 'Owner@123',
  });
  orgId = reg.body.data.organization._id;
}, 120000);

afterAll(async () => {
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

const event = (extraNotes = {}) => JSON.stringify({
  event: 'order.paid',
  payload: { order: { entity: { id: 'order_wh_1', notes: { kind: 'subscription', orgId, planId: 'pro', cycle: 'monthly', ...extraNotes } } } },
});

describe('Razorpay webhook', () => {
  it('is disabled (501) when no webhook secret is configured', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const res = await post(event(), 'irrelevant');
    expect(res.status).toBe(501);
  });

  it('rejects a bad signature (400) when enabled', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    const res = await post(event(), 'deadbeef');
    expect(res.status).toBe(400);
  });

  it('activates the subscription on a signed order.paid (backstop to client callback)', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    const raw = event();
    const res = await post(raw, sign(raw));
    expect(res.status).toBe(200);
    const org = await Organization.findById(orgId);
    expect(org.subscription.status).toBe('active');
    expect(org.subscription.planId).toBe('pro');
  });

  it('is idempotent — re-delivering the same event does not double-activate', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    const raw = event();
    await post(raw, sign(raw));
    const org = await Organization.findById(orgId);
    const activations = org.subscription.history.filter((h) => h.event === 'plan_activated').length;
    expect(activations).toBe(1); // only the first delivery applied
  });

  it('ignores unrelated events without error', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    const raw = JSON.stringify({ event: 'payment.failed', payload: {} });
    const res = await post(raw, sign(raw));
    expect(res.status).toBe(200);
    expect(res.body.ignored).toBeTruthy();
  });
});
