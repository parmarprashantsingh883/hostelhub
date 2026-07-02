import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { getPlan, GRACE_DAYS } from '../lib/plans.js';
import { ApiError, asyncHandler } from './error.middleware.js';

/**
 * SaaS subscription enforcement.
 * `protect` calls assertWritable() on every mutating request so a lapsed org
 * is frozen (reads keep working — owners can still see their data and renew).
 * Creation endpoints add enforceLimit() so plan limits actually mean something.
 */

// Tiny TTL cache — the write-gate must not add a DB round-trip to every mutation.
const cache = new Map(); // orgId -> { org, at }
const TTL_MS = 30 * 1000;

export async function loadOrg(orgId) {
  const key = orgId.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.org;
  const org = await Organization.findById(orgId);
  cache.set(key, { org, at: Date.now() });
  return org;
}

export const invalidateOrgCache = (orgId) => cache.delete(orgId.toString());

/** trialing | active | expired — the effective access state, incl. grace. */
export function subscriptionState(org) {
  const sub = org?.subscription;
  if (!sub) return 'expired';
  const now = Date.now();
  const grace = GRACE_DAYS * 86400000;
  if (sub.status === 'trialing') {
    return sub.trialEndsAt && now <= +new Date(sub.trialEndsAt) ? 'trialing' : 'expired';
  }
  if (sub.status === 'active') {
    return sub.currentPeriodEnd && now <= +new Date(sub.currentPeriodEnd) + grace ? 'active' : 'expired';
  }
  if (sub.status === 'canceled') {
    // Already-paid period (or remaining trial) is honored after cancellation.
    const until = sub.currentPeriodEnd || sub.trialEndsAt;
    return until && now <= +new Date(until) ? 'active' : 'expired';
  }
  return 'expired';
}

/** Throws 402 when the org's subscription has lapsed (called for writes only). */
export async function assertWritable(orgId) {
  const org = await loadOrg(orgId);
  if (!org || !org.isActive) throw new ApiError(403, 'This organization is deactivated');
  if (subscriptionState(org) === 'expired') {
    throw new ApiError(402, 'Your Quarters subscription has ended — choose a plan in Billing to continue');
  }
}

// Usage counters run inside the request's tenant context → auto org-scoped.
const COUNTERS = {
  rooms: () => Room.countDocuments(),
  residents: () => User.countDocuments({ role: 'tenant', 'tenantProfile.status': { $ne: 'moved_out' } }),
  staff: () => User.countDocuments({ role: 'staff' }),
};

/** Gate a create endpoint on the org's plan limit for `resource`. */
export const enforceLimit = (resource) =>
  asyncHandler(async (req, _res, next) => {
    const org = await loadOrg(req.user.orgId);
    const plan = getPlan(org?.subscription?.planId);
    const limit = plan.limits[resource];
    if (limit == null) return next(); // unlimited
    const used = await COUNTERS[resource]();
    if (used >= limit) {
      throw new ApiError(402, `Your ${plan.name} plan includes up to ${limit} ${resource} — upgrade in Billing to add more`);
    }
    next();
  });
