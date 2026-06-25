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
};
const login = (c) => request(app).post('/api/auth/login').send(c);
const token = async (c) => (await login(c)).body.data.accessToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let adminT;
let tenantT;
const allRooms = (occ) => occ.floors.flatMap((f) => f.rooms);

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('quarters_occ_test'));
  await runSeed({ exitAfter: false });
  adminT = await token(DEMO.admin);
  tenantT = await token(DEMO.tenant);
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mem?.stop();
});

describe('occupancy board', () => {
  it('returns KPIs + floors for admin', async () => {
    const res = await request(app).get('/api/occupancy').set(auth(adminT));
    expect(res.status).toBe(200);
    const { kpis, floors } = res.body.data;
    expect(kpis.totalBeds).toBeGreaterThan(0);
    expect(kpis.occupancyPct).toBeGreaterThanOrEqual(0);
    expect(kpis.occupancyPct).toBeLessThanOrEqual(100);
    expect(Array.isArray(floors)).toBe(true);
    expect(allRooms(res.body.data).length).toBeGreaterThan(0);
  });

  it('reflects beds held by active bookings as reserved', async () => {
    const res = await request(app).get('/api/occupancy').set(auth(adminT));
    // Seed reserves 2 beds in the dorm (reserved + confirmed).
    expect(res.body.data.kpis.reservedBeds).toBeGreaterThanOrEqual(1);
  });

  it('forbids a tenant (403) and blocks anon (401)', async () => {
    expect((await request(app).get('/api/occupancy').set(auth(tenantT))).status).toBe(403);
    expect((await request(app).get('/api/occupancy')).status).toBe(401);
  });
});

describe('booking pipeline → move-in provisioning', () => {
  let vacantRoomId;
  let fullRoomId;
  let bookingId;

  beforeAll(async () => {
    const occ = (await request(app).get('/api/occupancy').set(auth(adminT))).body.data;
    vacantRoomId = allRooms(occ).find((r) => r.vacantBeds > 0 && r.status !== 'maintenance')?._id;
    fullRoomId = allRooms(occ).find((r) => r.vacantBeds === 0 && r.status === 'occupied')?._id;
  });

  it('lists the pipeline with per-status counts', async () => {
    const res = await request(app).get('/api/bookings').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toHaveProperty('reserved');
    expect(res.body.data.counts).toHaveProperty('moved_in');
  });

  it('reserves a bed in a room with vacancy (201)', async () => {
    const res = await request(app).post('/api/bookings').set(auth(adminT)).send({
      name: 'Move-In Test', phone: '+91 9777000111', email: 'qrtest.movein@example.com',
      roomId: vacantRoomId, moveInDate: new Date().toISOString(), securityDeposit: 4500, tokenAmount: 1000,
    });
    expect(res.status).toBe(201);
    bookingId = res.body.data.booking._id;
  });

  it('refuses to reserve a bed in a full room (422)', async () => {
    const res = await request(app).post('/api/bookings').set(auth(adminT)).send({
      name: 'No Room', phone: '+91 9777000222', roomId: fullRoomId, moveInDate: new Date().toISOString(),
    });
    expect(res.status).toBe(422);
  });

  it('moving in provisions a tenant and fills a bed (occupied +1)', async () => {
    const before = (await request(app).get('/api/occupancy').set(auth(adminT))).body.data.kpis.occupiedBeds;
    const res = await request(app).put(`/api/bookings/${bookingId}/status`).set(auth(adminT)).send({ status: 'moved_in' });
    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('moved_in');
    const after = (await request(app).get('/api/occupancy').set(auth(adminT))).body.data.kpis.occupiedBeds;
    expect(after).toBe(before + 1);
    // The provisioned tenant can be found.
    const provisioned = await request(app).get('/api/tenants').set(auth(adminT));
    expect(JSON.stringify(provisioned.body)).toContain('qrtest.movein@example.com');
  });

  it('cannot move in the same booking twice (409)', async () => {
    const res = await request(app).put(`/api/bookings/${bookingId}/status`).set(auth(adminT)).send({ status: 'moved_in' });
    expect(res.status).toBe(409);
  });

  it('forbids a tenant from creating a booking (403)', async () => {
    const res = await request(app).post('/api/bookings').set(auth(tenantT)).send({
      name: 'X', phone: '1', roomId: vacantRoomId, moveInDate: new Date().toISOString(),
    });
    expect(res.status).toBe(403);
  });
});
