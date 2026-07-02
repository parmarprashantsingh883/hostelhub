/**
 * SaaS plan catalog — the single source of truth for pricing and limits.
 * Prices are INR. `null` limit = unlimited. The FE fetches this via
 * GET /api/billing/plans — never hardcode plan data client-side.
 */
export const TRIAL_DAYS = 14;
export const TRIAL_PLAN = 'pro';
export const GRACE_DAYS = 3; // post-expiry grace before writes are blocked

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For a single small PG',
    priceMonthly: 799,
    priceYearly: 7990, // 2 months free
    limits: { rooms: 15, residents: 50, staff: 5 },
    features: [
      'Rooms, beds & occupancy engine',
      'Residents, rent & digital receipts',
      'Complaints, visitors & notices',
      'Email notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing PGs & co-living',
    popular: true,
    priceMonthly: 1999,
    priceYearly: 19990,
    limits: { rooms: 60, residents: 200, staff: 20 },
    features: [
      'Everything in Starter',
      'WhatsApp + SMS reminders',
      'Maintenance, assets & inspections',
      'Staff attendance, payroll & access control',
      'Agreements with e-sign',
      'Reports & P&L',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For multi-floor & premium operators',
    priceMonthly: 4999,
    priceYearly: 49990,
    limits: { rooms: null, residents: null, staff: null },
    features: [
      'Everything in Pro',
      'Unlimited rooms, residents & staff',
      'Approvals workflow & recycle bin',
      'Priority support',
    ],
  },
];

export const getPlan = (id) => PLANS.find((p) => p.id === id) || PLANS.find((p) => p.id === TRIAL_PLAN);

export const planPrice = (plan, cycle) => (cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly);
