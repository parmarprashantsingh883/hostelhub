import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

let mem;
const DEMO = { tenant: { email: 'tenant@quarters.app', password: 'Tenant@123' } };
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let tenantT;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_profile_test'));
  await runSeed({ exitAfter: false });
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('advanced profile', () => {
  it('tenant updates emergency & guardian contacts', async () => {
    const res = await request(app).put('/api/auth/profile').set(auth(tenantT)).send({
      emergencyContact: { name: 'Asha Verma', phone: '+91 9000011111', relation: 'Mother' },
      guardianDetails: { name: 'Ravi Verma', phone: '+91 9000022222', address: 'Pune' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.tenantProfile.emergencyContact.name).toBe('Asha Verma');
    expect(res.body.data.user.tenantProfile.guardianDetails.name).toBe('Ravi Verma');

    const me = await request(app).get('/api/auth/me').set(auth(tenantT));
    expect(me.body.data.user.tenantProfile.emergencyContact.relation).toBe('Mother');
  });

  it('uploads an avatar (sets profileImage)', async () => {
    const res = await request(app).put('/api/auth/avatar').set(auth(tenantT))
      .attach('avatar', Buffer.from('fake-image-bytes'), 'me.png');
    expect(res.status).toBe(200);
    expect(res.body.data.user.profileImage).toMatch(/^\/uploads\//);
  });

  it('rejects avatar upload with no file (400)', async () => {
    const res = await request(app).put('/api/auth/avatar').set(auth(tenantT));
    expect(res.status).toBe(400);
  });
});
