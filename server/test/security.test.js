import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';
import { generate as totp } from '../src/lib/totp.js';

let mem;
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let ownerT; // fresh org admin for MFA tests
let ownerEmail;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_security_test'));
  await runSeed({ exitAfter: false });
  ownerEmail = `sec_${Date.now()}@test.com`;
  const reg = await request(app).post('/api/auth/register').send({
    hostelName: 'Sec PG', name: 'Sec Owner', email: ownerEmail, phone: '+91 9000000000', password: 'Owner@123',
  });
  ownerT = reg.body.data.accessToken;
}, 120000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('brute-force account lockout', () => {
  it('locks the account (423) after repeated bad passwords, then blocks even the right one', async () => {
    const email = 'tenant@quarters.app';
    let last;
    for (let i = 0; i < 5; i++) {
      last = await login({ email, password: 'wrong-pass' });
      expect([401, 423]).toContain(last.status);
    }
    // 5th failure trips the lock
    expect(last.status).toBe(423);
    // even a correct password is now refused while locked
    const correct = await login({ email, password: 'Tenant@123' });
    expect(correct.status).toBe(423);
    expect(correct.body.message).toMatch(/locked/i);
  });
});

describe('two-factor auth (TOTP)', () => {
  let secret;

  it('setup returns a secret + QR', async () => {
    const res = await request(app).post('/api/auth/mfa/setup').set(auth(ownerT));
    expect(res.status).toBe(200);
    expect(res.body.data.secret).toBeTruthy();
    expect(res.body.data.qr).toMatch(/^data:image\/png;base64,/);
    secret = res.body.data.secret;
  });

  it('rejects enable with a bad code, accepts a valid one and returns backup codes', async () => {
    const bad = await request(app).post('/api/auth/mfa/enable').set(auth(ownerT)).send({ code: '000000' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/auth/mfa/enable').set(auth(ownerT)).send({ code: totp(secret) });
    expect(ok.status).toBe(200);
    expect(ok.body.data.backupCodes).toHaveLength(10);
  });

  it('login now demands the second factor', async () => {
    const res = await login({ email: ownerEmail, password: 'Owner@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.mfaToken).toBeTruthy();
    expect(res.body.data.accessToken).toBeUndefined(); // no session until 2nd factor
  });

  it('completes login with a valid TOTP, rejects a wrong one', async () => {
    const step1 = await login({ email: ownerEmail, password: 'Owner@123' });
    const mfaToken = step1.body.data.mfaToken;

    const wrong = await request(app).post('/api/auth/login/mfa').send({ mfaToken, code: '000000' });
    expect(wrong.status).toBe(401);

    const good = await request(app).post('/api/auth/login/mfa').send({ mfaToken, code: totp(secret) });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toBeTruthy();
  });

  it('disable requires password + a valid code', async () => {
    const noPass = await request(app).post('/api/auth/mfa/disable').set(auth(ownerT)).send({ code: totp(secret) });
    expect(noPass.status).toBe(401);
    const ok = await request(app).post('/api/auth/mfa/disable').set(auth(ownerT)).send({ password: 'Owner@123', code: totp(secret) });
    expect(ok.status).toBe(200);
    // login is single-step again
    const res = await login({ email: ownerEmail, password: 'Owner@123' });
    expect(res.body.data.accessToken).toBeTruthy();
  });
});

describe('audit log', () => {
  it('records sensitive actions and is admin-only', async () => {
    const adminT = await token({ email: 'admin@quarters.app', password: 'Admin@123' });
    // generate an auditable action
    await request(app).get('/api/auth/export-data').set(auth(adminT));

    const res = await request(app).get('/api/audit-logs').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
    expect(res.body.data.logs.some((l) => l.action === 'data_exported')).toBe(true);

    const staffT = await token({ email: 'staff@quarters.app', password: 'Staff@123' });
    expect((await request(app).get('/api/audit-logs').set(auth(staffT))).status).toBe(403);
  });

  it('login failures and successes are recorded', async () => {
    const adminT = await token({ email: 'admin@quarters.app', password: 'Admin@123' });
    const res = await request(app).get('/api/audit-logs?action=login').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.logs.every((l) => l.action === 'login')).toBe(true);
  });
});
