import Room from '../models/Room.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import Lead from '../models/Lead.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/search?q= — org-scoped global search that powers the ⌘K palette.
 * Runs inside the request's tenant context (protect), so every query is
 * automatically scoped to the caller's organization. Staff see a narrower set.
 */
export const globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: { results: [] } });
  const rx = new RegExp(escapeRx(q), 'i');
  const isAdmin = req.user.role === 'admin';

  const jobs = [
    Room.find({ roomNumber: rx }).limit(5).select('roomNumber floor roomType status').lean()
      .then((rows) => rows.map((r) => ({
        type: 'room', label: 'Room', id: r._id,
        title: `Room ${r.roomNumber}`, sub: `Floor ${r.floor} · ${r.roomType} · ${r.status}`, to: '/admin/rooms',
      }))),
    User.find({ role: 'tenant', $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .limit(6).select('name email profileImage').lean()
      .then((rows) => rows.map((u) => ({
        type: 'resident', label: 'Resident', id: u._id,
        title: u.name, sub: u.email || '', image: u.profileImage || '', to: '/admin/tenants',
      }))),
    Complaint.find({ title: rx }).limit(5).select('title status priority').lean()
      .then((rows) => rows.map((c) => ({
        type: 'complaint', label: 'Complaint', id: c._id,
        title: c.title, sub: `${c.status} · ${c.priority}`, to: isAdmin ? '/admin/complaints' : '/staff/complaints',
      }))),
  ];

  if (isAdmin) {
    jobs.push(
      User.find({ role: 'staff', $or: [{ name: rx }, { email: rx }] })
        .limit(5).select('name email profileImage staffProfile.staffType').lean()
        .then((rows) => rows.map((u) => ({
          type: 'staff', label: 'Staff', id: u._id,
          title: u.name, sub: u.staffProfile?.staffType || 'staff', image: u.profileImage || '', to: '/admin/staff',
        }))),
      Lead.find({ $or: [{ name: rx }, { phone: rx }] })
        .limit(5).select('name phone stage').lean()
        .then((rows) => rows.map((l) => ({
          type: 'lead', label: 'Lead', id: l._id,
          title: l.name, sub: `${l.phone} · ${l.stage}`, to: '/admin/leads',
        }))),
    );
  }

  const results = (await Promise.all(jobs)).flat();
  res.json({ success: true, data: { results } });
});
