# 🏠 HostelHub — Smart PG & Hostel Management

A full-stack (MERN) platform for running a PG or hostel: rooms & beds, tenants, staff, rent
collection (with online payments), complaints, visitors, food menu, notices, documents and
reports — with role-based dashboards for **Admin**, **Tenant** and **Staff**.

---

## ✨ Features

### Admin
- **Dashboard** — occupancy, monthly collection vs. pending, complaint trends, revenue charts
- **Rooms** — rooms, bed capacity, facilities, occupancy status
- **Tenants** — onboard, assign rooms, deactivate (move-out)
- **Staff** — manage staff and their type (maintenance, security, cleaning…)
- **Rent & Payments** — generate monthly rent, track paid/pending, late fees & discounts
- **Complaints** — assign to staff, set priority, resolve/reject, see ratings
- **Notices** — publish announcements (pin, category, priority, target audience)
- **Visitors** — check guests in/out, reject entries
- **Food Menu** — plan the weekly mess menu
- **Reports** — revenue, pending rent, occupancy, complaints, staff tasks (with **CSV export**)

### Tenant
- **Dashboard** — rent due, room summary, open complaints, upcoming visitors
- **My Room** — room details, facilities, tenancy info
- **My Rent** — pay online (Razorpay), download receipts
- **Complaints** — raise and track, rate resolutions
- **Visitors** — pre-register expected guests
- **Food Menu** — view the weekly menu and rate meals
- **Notices** — read announcements
- **Documents** — download agreements / verification docs shared by admin

### Staff
- **Dashboard** — assigned / in-progress / resolved-today task counts
- **My Tasks** — complaints assigned to you, add work notes, update status
- **Visitor Log** — check visitors in/out at the gate
- **Notices** — read announcements

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · Vite 5 · React Router 6 · Tailwind CSS · Axios · lucide-react · react-hot-toast |
| Backend | Node.js · Express · Mongoose (MongoDB) · JWT (access + refresh) · Zod validation |
| Database | MongoDB — or zero-setup **in-memory MongoDB** for local dev (`mongodb-memory-server`) |
| Payments | Razorpay (with a dev **mock mode** that completes instantly — no keys needed) |

---

## 📁 Project Structure

```
HostelHub/
├── client/                 # React + Vite SPA
│   └── src/
│       ├── api/            # axios instance (token injection + refresh-on-401)
│       ├── components/ui/  # shared UI kit (Button, Card, Table, Modal, StatCard…)
│       ├── context/        # AuthContext (useAuth)
│       ├── layouts/        # DashboardLayout (role-aware sidebar + topbar)
│       ├── pages/          # public / admin / tenant / staff / shared
│       └── routes/         # Protected + GuestOnly route guards
└── server/                 # Express REST API
    └── src/
        ├── config/         # db (in-memory or real Mongo)
        ├── controllers/    # one per resource
        ├── middleware/     # auth, error, upload, validate
        ├── models/         # Mongoose schemas
        ├── routes/         # 13 route groups (see below)
        └── seed/           # demo-data seeder
```

---

## 🚀 Quick Start

> **Prerequisites:** Node.js 18+ and npm. No local MongoDB required for dev — the server
> spins up an in-memory database automatically.

### 1. Backend (port **5000**)

```bash
cd server
npm install
cp .env.example .env      # defaults already work for dev (USE_MEMORY_DB=true)
npm run dev
```

On boot it starts an in-memory MongoDB, **auto-seeds demo data**, and prints the API URL.

### 2. Frontend (port **5173**)

```bash
cd client
npm install               # if your global npm cache is root-owned, use:
                          # npm install --cache /tmp/npm-cache-hostelhub
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/uploads` to the backend on `:5000`.

---

## 🔑 Demo Credentials

Seeded automatically when `USE_MEMORY_DB=true`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hostelhub.com` | `Admin@123` |
| Tenant | `tenant@hostelhub.com` | `Tenant@123` |
| Staff | `staff@hostelhub.com` | `Staff@123` |

---

## ⚙️ Environment Variables (`server/.env`)

| Variable | Purpose | Dev default |
|----------|---------|-------------|
| `PORT` | API port | `5000` |
| `CLIENT_URL` | CORS origin | `http://localhost:5173` |
| `USE_MEMORY_DB` | Use in-memory MongoDB + auto-seed | `true` |
| `MONGO_URI` | Real MongoDB URI (used when `USE_MEMORY_DB` is not `true`) | — |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets | set in `.env` |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Token lifetimes | `15m` / `7d` |
| `SMTP_*`, `EMAIL_FROM` | Email (notices / password reset). Optional in dev | empty |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Online payments. **Empty → mock mode** (pays instantly) | empty |

To use a **real MongoDB** instead of the in-memory one, set `USE_MEMORY_DB=false` and a valid
`MONGO_URI`, then seed once with `npm run seed`.

---

## 🔌 API Overview

Base URL: `http://localhost:5000/api`. All responses use the envelope
`{ success, message?, data? }`. Protected routes expect `Authorization: Bearer <accessToken>`;
a httpOnly refresh cookie auto-renews the access token on `401`.

| Group | Base path | Highlights |
|-------|-----------|-----------|
| Auth | `/auth` | register, login, refresh, logout, forgot/reset password, me, profile, change-password |
| Dashboard | `/dashboard` | `/admin`, `/tenant`, `/staff` role summaries |
| Rooms | `/rooms` | CRUD, occupancy |
| Tenants | `/tenants` | CRUD, per-tenant rent & complaints |
| Staff | `/staff` | CRUD |
| Rent | `/rents` | generate, pay, verify, receipt |
| Complaints | `/complaints` | create, assign, status, notes, rating |
| Notices | `/notices` | CRUD (admin), list (all) |
| Visitors | `/visitors` | create (tenant), check-in/out/reject (admin/staff) |
| Food Menu | `/food-menu` | CRUD (admin), feedback (tenant) |
| Documents | `/documents` | upload (admin), list, delete |
| Reports | `/reports` | revenue, pending-rent, occupancy, complaints, staff-tasks (`?format=csv`) |
| Notifications | `/notifications` | in-app notifications |

---

## 📜 Scripts

**server/**
| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon (auto-seeds in memory-DB mode) |
| `npm start` | Start API (production) |
| `npm run seed` | Seed demo data into the configured database |

**client/**
| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |

---

## 📝 Notes

- **Zero-config dev:** with `USE_MEMORY_DB=true`, data resets on each restart and re-seeds — ideal for demos.
- **Payments in dev:** with no Razorpay keys, rent payments complete instantly via mock mode; wire real keys for live checkout.
- **Auth:** short-lived access tokens kept in memory + a httpOnly refresh cookie; the axios client refreshes transparently on `401`.
