import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';
import Organization from '../src/models/Organization.js';

let mem;
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_dpdp_test'));
  await runSeed({ exitAfter: false });
  adminT = await token({ email: 'admin@quarters.app', password: 'Admin@123' });
  tenantT = await token({ email: 'tenant@quarters.app', password: 'Tenant@123' });
}, 120000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('DPDP — data export (right to access)', () => {
  it('a tenant can export their own data with their records', async () => {
    const res = await request(app).get('/api/auth/export-data').set(auth(tenantT));
    expect(res.status).toBe(200);
    expect(res.body.data.account.email).toBe('tenant@quarters.app');
    expect(Array.isArray(res.body.data.rents)).toBe(true);
    // account must never leak secrets
    expect(res.body.data.account.password).toBeUndefined();
    expect(res.body.data.account.refreshTokenHash).toBeUndefined();
  });

  it('an admin export includes the organization', async () => {
    const res = await request(app).get('/api/auth/export-data').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.organization?.slug).toBe('sunrise-pg');
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/auth/export-data')).status).toBe(401);
  });
});

describe('DPDP — account deletion (right to erasure)', () => {
  it('a non-owner (tenant) cannot delete the organization (403)', async () => {
    const res = await request(app).delete('/api/auth/account').set(auth(tenantT)).send({ password: 'Tenant@123' });
    expect(res.status).toBe(403);
  });

  it('the owner must supply the correct password (401)', async () => {
    const res = await request(app).delete('/api/auth/account').set(auth(adminT)).send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('the owner deletes the whole org and all its data', async () => {
    // fresh throwaway org so the assertion is unambiguous
    const reg = await request(app).post('/api/auth/register').send({
      hostelName: 'Delete Me PG', name: 'Temp Owner', email: 'temp@del.test', phone: '+91 9000000000', password: 'Owner@123',
    });
    expect(reg.status).toBe(201);
    const orgId = reg.body.data.organization._id;
    const tempT = reg.body.data.accessToken;

    const del = await request(app).delete('/api/auth/account').set(auth(tempT)).send({ password: 'Owner@123' });
    expect(del.status).toBe(200);
    expect(del.body.data.deleted.User).toBeGreaterThanOrEqual(1);

    // org is gone, its owner can no longer log in, demo org untouched
    expect(await Organization.findById(orgId)).toBeNull();
    expect((await login({ email: 'temp@del.test', password: 'Owner@123' })).status).toBe(401);
    expect(await Organization.findOne({ slug: 'sunrise-pg' })).not.toBeNull();
  });
});
