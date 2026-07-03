# Quarters — Production Runbook

The checklist for taking a Quarters deployment from demo to paying customers.
Everything ships **mock-first**: with no keys set, payments, email, WhatsApp/SMS
and error tracking all run in safe demo modes. Each section below flips one of
them live.

## 1. Environment matrix (server)

| Variable | Required in prod | Purpose |
|---|---|---|
| `NODE_ENV` | ✅ `production` | enables prod guards in `config/env.js` |
| `MONGO_URI` | ✅ | Atlas connection string — boot fails without it |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | long random strings; rotating them logs everyone out |
| `CLIENT_URL` | ✅ | FE origin — CORS allowlist + links in email |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for live billing + rent | unset = mock gateway (demo checkout) |
| `SMTP_HOST/PORT/USER/PASS` | for real email | unset = emails logged, not sent |
| `SENTRY_DSN` | recommended | unset = error tracking off; set = 5xx + crashes reported with org/user context |
| `SENTRY_TRACES_RATE` | optional | APM sample rate, default `0.1` |
| `SEED_ON_BOOT` | ❌ never in prod | demo-only convenience |

Client build-time: `VITE_API_URL` (the API origin for split deploys).

## 2. SaaS billing goes live

1. Set the Razorpay keys — `POST /api/billing/checkout` switches from the demo
   gateway to real orders automatically (price is resolved server-side from
   `server/src/lib/plans.js`; the client never sends an amount).
2. Plan prices/limits live in `plans.js` only. The FE and the landing page read
   them via `GET /api/billing/plans` — edit one file to change pricing.
3. Trials: every signup gets `TRIAL_DAYS` (14) of Pro. Lapsed orgs are
   write-frozen with a 3-day grace (`GRACE_DAYS`); reads and the Billing page
   stay open so owners can renew themselves.

## 3. Database

- **Backups**: enable Atlas **Continuous Cloud Backup** (M10+) or scheduled
  snapshots (M2/M5) — this is an Atlas console setting, not code. Test a
  restore once before onboarding a paying customer.
- **Multi-tenancy**: every tenant-owned collection is scoped by `orgId`
  (`lib/tenantPlugin.js`). New models MUST apply the plugin; new public
  endpoints MUST resolve the org from the link (`?org=<slug>`, see
  `middleware/tenant.middleware.js`).
- **Legacy data**: documents created before multi-tenancy have no `orgId` and
  are only visible to legacy accounts without one. For a clean demo DB, drop
  and re-seed (`npm run seed`).

## 4. Email deliverability

SMTP alone lands in spam. Before real customers:
1. Send from a domain you own (not gmail), via a transactional provider
   (Resend / SES / Postmark / Brevo free tiers all work with the existing
   SMTP config).
2. Add **SPF + DKIM + DMARC** DNS records for that domain.

## 5. Observability

- Set `SENTRY_DSN` → 5xx responses, unhandled rejections and crashes are
  captured with method/url/orgId/userId context (`config/monitoring.js`).
- Uptime: point a free monitor (UptimeRobot/BetterStack) at `GET /api/health`;
  `GET /api/ready` is the DB-aware probe for load balancers.
- Logs: `morgan combined` on stdout — Render/Railway capture these natively.

## 6. CI / deploys

- GitHub Actions (`.github/workflows/ci.yml`) runs the server suite and the
  client lint+test+build on every push/PR to `main`.
- Render (API) and Vercel (client) auto-deploy from `main`. For a staging
  environment, create a second Render service + Vercel preview pointed at a
  `staging` branch with its own Atlas database.

## 7. Pre-launch smoke test (5 minutes)

1. Sign up a fresh org → lands on an empty dashboard, Billing shows a 14-day
   Pro trial.
2. Add a room + resident → generate rent → pay (live gateway) → receipt PDF
   downloads and its QR verifies at `/verify/:id`.
3. Billing → choose a plan → complete checkout → plan shows Active.
4. Public enquiry link `/book?org=<slug>` → lead appears in that org's Leads
   board only.
5. Log in as staff → confirm a permission-gated action 403s until granted in
   Staff Access.
