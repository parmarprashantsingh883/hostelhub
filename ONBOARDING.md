# HostelHub — Project Handoff for Nova 2.0

> **Ownership:** As of **2026-06-17**, HostelHub is owned and maintained by **Nova 2.0**.
> This document is everything you need to take it over. Read it top-to-bottom once, then use it as a map.

---

## 1. What HostelHub is

A full-stack **MERN** SaaS for running a **PG / hostel / co-living** property: rooms & beds, tenants,
staff, **rent collection (online payments)**, complaints, visitors, food menu, notices, documents and
reports — with **role-based portals** for **Admin**, **Tenant**, and **Staff**.

It's India-focused (₹ / INR, Razorpay, PG terminology). The concept is validated by real products in
this market — model features/UX on **RentOk**, **TrackMyPG**, and **Crib** (India PG SaaS).

**Location:** `~/Desktop/prashant/fullstack/HostelHub` — two apps: `client/` (React) and `server/` (Express).

---

## 2. Status snapshot

| Area | State |
|------|-------|
| **Backend** | ✅ 100% — Express/Mongoose/JWT, all 13 route groups, boot-tested |
| **Frontend (features)** | ✅ 100% — every role page exists; `npm run build` clean (2464 modules); boot-tested (all endpoints return expected shapes) |
| **Frontend (visual revamp)** | 🟡 in progress — new **"fresh living" emerald** identity applied to the shared layer + tenant Dashboard & My Room; **remaining pages still need the same pass** (see §8) |
| **Production-readiness** | ❌ not yet — see the roadmap in §9 (multi-tenancy is the #1 gap) |

---

## 3. Tech stack

- **Frontend:** React 18 · Vite 5 · React Router 6 · Tailwind CSS (v4, `@theme` tokens) · Axios · recharts · lucide-react · react-hot-toast
- **Backend:** Node/Express · Mongoose (MongoDB) · JWT (access + httpOnly refresh) · Zod validation
- **DB:** MongoDB — or zero-setup **in-memory MongoDB** for dev (`mongodb-memory-server`, auto-seeds)
- **Payments:** Razorpay, with a dev **mock mode** (completes instantly, no keys needed)

---

## 4. How to run it

```bash
# 1) Backend — port 5000 (in-memory Mongo + auto-seed)
cd server && npm install && cp .env.example .env && npm run dev

# 2) Frontend — port 8080
cd client && npm install && npm run dev -- --port 8080 --strictPort
```

- App: **http://localhost:8080** · API proxied to `:5000`
- **Dev shortcut:** `http://localhost:8080/login?demo=tenant` auto-logs in (also `?demo=admin` / `?demo=staff`) — dev-only, guarded by `import.meta.env.DEV`.
- **Demo creds:** `admin@hostelhub.com / Admin@123` · `tenant@hostelhub.com / Tenant@123` · `staff@hostelhub.com / Staff@123`

> ⚠️ **Gotchas:** in-memory DB **wipes on every restart** (re-seeds automatically). If `npm install` hits a root-owned cache, use `npm install --cache /tmp/npm-cache-hostelhub`. Client runs on **:8080** (not 5173) to avoid a favicon-cache clash with another local app.

---

## 5. Repo structure

```
client/src/
  api/client.js          # axios instance: token injection + refresh-on-401
  components/ui/index.jsx # the ENTIRE shared UI kit (one file)
  context/AuthContext.jsx # useAuth() → { user, setUser, refreshMe, login, logout }
  layouts/DashboardLayout.jsx # role-aware sidebar + topbar shell
  pages/ public | admin | tenant | staff | shared
  routes/Protected.jsx   # Protected + GuestOnly guards
server/src/
  config/db.js  controllers/  middleware/  models/  routes/ (13)  seed/seed.js
```

---

## 6. Frontend conventions (follow these)

- Pages import data helpers from `../../api/client` (`api`, `errMsg`) and UI from `../../components/ui`.
- **UI kit exports:** `Button, Field, Input, Select, Textarea, Card, Badge, StatusBadge, Modal, ConfirmDialog, Spinner, Skeleton, EmptyState, StatCard, Table, Td, PageHeader, inr, fmtDate, fmtDateTime`.
- **API envelope:** every response is `{ success, message?, data }` — read `res.data.data.<key>`.
- **Auth:** `useAuth()` from `../../context/AuthContext`. Access token in memory + httpOnly refresh cookie; axios auto-refreshes on 401.
- Page-level fetch pattern: `useState` + `useCallback(load)` + `useEffect`; toast on error; `Spinner`/`Skeleton` while loading; `EmptyState` when empty.

---

## 7. API overview (base `/api`)

`auth` · `dashboard` (/admin /tenant /staff) · `rooms` · `tenants` · `staff` · `rents` · `complaints` ·
`notices` · `visitors` · `food-menu` · `documents` · `reports` (revenue/pending-rent/occupancy/complaints/staff-tasks, `?format=csv`) · `notifications`.

---

## 8. UI identity — "fresh living" (emerald)

Deliberately **distinct from an enterprise ERP**: light, warm, rounded, friendly.

- **Brand:** emerald (`--color-brand-*` in `client/src/index.css`) · **accent:** amber (`--color-sun-*`) · **neutrals:** warm (`--color-ink-*`) · **bg:** `#faf9f6`
- **Font:** Plus Jakarta Sans (loaded in `index.html`)
- **Sidebar:** light, with a **House** logo and emerald filled active pills
- **Heroes:** emerald gradient `from-brand-500 via-brand-600 to-brand-800` + amber/white glow
- **Done:** shared layer (tokens, `DashboardLayout`, UI kit), `tenant/Dashboard` (rent-trend recharts chart + payment-reliability SVG ring + skeletons), `tenant/MyRoom`, `public/AuthShell` + one-click demo login
- **TODO (carry the same look + depth):** tenant Visitors / Food Menu / Documents, shared Notices / Profile, and the **admin + staff dashboards** (still the plainer style)

---

## 9. Roadmap to a sellable SaaS (priority order)

1. **Multi-tenancy (BLOCKER).** Data is **single-tenant** today — no `propertyId`/`ownerId` scoping; one deployment can't safely serve multiple PG owners. Add a property/owner boundary to every model + query + auth check. *Nothing else matters until this is done.*
2. **Real payments:** live Razorpay keys, webhook verification, refunds, **GST-compliant invoices** (India).
3. **Persistence & files:** managed MongoDB + backups (dev uses wipe-on-restart in-memory); move uploads off local disk to S3/Cloudinary.
4. **Automated tests** (none exist).
5. **Email/SMS:** SMTP for notices/reset; OTP/WhatsApp (table-stakes for Indian PGs).
6. **Onboarding & ops:** self-serve owner signup + property setup, subscriptions/billing, logging + error tracking (Sentry), CI/CD, hosting + SSL.
7. **Compliance:** terms, privacy, DPDP Act (India).

---

## 10. Market references

- **RentOk** (rentok.com) — closest direct competitor; rent automation, bed-level occupancy, tenant self-signup links
- **TrackMyPG** — bed-wise/room-wise pricing, auto invoices
- **Crib** — tenant app at scale (60+ cities); rent reminders, payments, complaints
- Polish bar: **Stripe Dashboard, Linear, Notion**

---

_Handoff prepared 2026-06-17. Questions about history → ask Prashant._
