import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';
import { waLink, smsLink, toE164 } from '../src/services/messaging.service.js';

// ── Pure link builders (no DB / no provider) ──────────────────────────
describe('messaging link builders (free mode)', () => {
  it('toE164 prepends the default country code to bare 10-digit mobiles', () => {
    expect(toE164('9000010000')).toBe('919000010000');
    expect(toE164('+91 90000 10000')).toBe('919000010000');
  });
  it('waLink builds an encoded wa.me URL', () => {
    const u = waLink('9000010000', 'Hi ₹100');
    expect(u).toMatch(/^https:\/\/wa\.me\/919000010000\?text=/);
    expect(u).toContain(encodeURIComponent('Hi ₹100'));
  });
  it('smsLink builds an sms: URL', () => {
    expect(smsLink('+91 90000 10000', 'Pay rent')).toMatch(/^sms:919000010000\?body=/);
  });
});

// ── /rents/:id/remind ─────────────────────────────────────────────────
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
let rentId;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_messaging_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
  const res = await request(app).get('/api/rents').set(auth(adminT)).query({ limit: 1 });
  rentId = res.body.data.rents[0]?._id;
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('rent reminders — WhatsApp / SMS / Email', () => {
  it('WhatsApp reminder returns a free click-to-send link', async () => {
    const res = await request(app).post(`/api/rents/${rentId}/remind`).set(auth(adminT)).send({ channel: 'whatsapp' });
    expect(res.status).toBe(200);
    expect(res.body.data.channel).toBe('whatsapp');
    expect(res.body.data.mode).toBe('link');
    expect(res.body.data.url).toMatch(/^https:\/\/wa\.me\//);
    expect(typeof res.body.data.message).toBe('string');
  });

  it('SMS reminder returns a free sms: link', async () => {
    const res = await request(app).post(`/api/rents/${rentId}/remind`).set(auth(adminT)).send({ channel: 'sms' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/^sms:/);
  });

  it('Email reminder sends (mode: sent)', async () => {
    const res = await request(app).post(`/api/rents/${rentId}/remind`).set(auth(adminT)).send({ channel: 'email' });
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('sent');
  });

  it('rejects an unknown channel (400)', async () => {
    const res = await request(app).post(`/api/rents/${rentId}/remind`).set(auth(adminT)).send({ channel: 'pigeon' });
    expect(res.status).toBe(400);
  });

  it('forbids a tenant from sending reminders (403)', async () => {
    const res = await request(app).post(`/api/rents/${rentId}/remind`).set(auth(tenantT)).send({ channel: 'whatsapp' });
    expect(res.status).toBe(403);
  });
});
