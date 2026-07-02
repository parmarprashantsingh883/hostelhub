import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { PLANS, getPlan, planPrice, TRIAL_DAYS } from '../lib/plans.js';
import { createOrder, verifySignature, paymentMode } from '../services/payment.service.js';
import { subscriptionState, invalidateOrgCache } from '../middleware/subscription.middleware.js';

/** GET /api/billing/plans — public (pricing page + billing page both read it). */
export const listPlans = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { plans: PLANS, trialDays: TRIAL_DAYS, mode: paymentMode() } });
});

/** GET /api/billing (admin) — subscription, effective state, plan, live usage. */
export const summary = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.orgId);
  if (!org) throw new ApiError(404, 'Organization not found');
  const plan = getPlan(org.subscription?.planId);
  const [rooms, residents, staff] = await Promise.all([
    Room.countDocuments(),
    User.countDocuments({ role: 'tenant', 'tenantProfile.status': { $ne: 'moved_out' } }),
    User.countDocuments({ role: 'staff' }),
  ]);
  const state = subscriptionState(org);
  const sub = org.subscription;
  const until = sub?.status === 'trialing' ? sub?.trialEndsAt : sub?.currentPeriodEnd;
  const daysLeft = until ? Math.max(0, Math.ceil((+new Date(until) - Date.now()) / 86400000)) : 0;
  res.json({
    success: true,
    data: {
      organization: { _id: org._id, name: org.name, slug: org.slug, createdAt: org.createdAt },
      subscription: sub,
      state,
      daysLeft,
      plan,
      usage: {
        rooms: { used: rooms, limit: plan.limits.rooms },
        residents: { used: residents, limit: plan.limits.residents },
        staff: { used: staff, limit: plan.limits.staff },
      },
      mode: paymentMode(),
    },
  });
});

/** POST /api/billing/checkout { planId, cycle } — price is resolved
 *  server-side from the catalog; the client never sends an amount. */
export const checkout = asyncHandler(async (req, res) => {
  const { planId, cycle = 'monthly' } = req.body;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new ApiError(400, 'Unknown plan');
  if (!['monthly', 'yearly'].includes(cycle)) throw new ApiError(400, 'Invalid billing cycle');

  const org = await Organization.findById(req.user.orgId);
  if (!org) throw new ApiError(404, 'Organization not found');

  const amount = planPrice(plan, cycle);
  const result = await createOrder({ amountInRupees: amount, receiptId: `sub_${org._id}` });
  org.subscription.gatewayOrderId = result.order.id;
  await org.save();
  invalidateOrgCache(org._id);
  res.json({ success: true, data: { ...result, amount, cycle, plan: { id: plan.id, name: plan.name } } });
});

/** POST /api/billing/activate { planId, cycle, orderId, paymentId, signature } */
export const activate = asyncHandler(async (req, res) => {
  const { planId, cycle = 'monthly', orderId, paymentId, signature } = req.body;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new ApiError(400, 'Unknown plan');
  if (!verifySignature({ orderId, paymentId, signature })) {
    throw new ApiError(400, 'Payment verification failed — you have not been charged twice; retry from Billing');
  }

  const org = await Organization.findById(req.user.orgId);
  if (!org) throw new ApiError(404, 'Organization not found');

  const days = cycle === 'yearly' ? 365 : 30;
  org.subscription.planId = plan.id;
  org.subscription.status = 'active';
  org.subscription.cycle = cycle;
  org.subscription.currentPeriodEnd = new Date(Date.now() + days * 86400000);
  org.subscription.cancelAtPeriodEnd = false;
  org.subscription.gatewayPaymentId = paymentId || null;
  org.subscription.history.push({
    event: 'plan_activated',
    planId: plan.id,
    cycle,
    amount: planPrice(plan, cycle),
    paymentRef: paymentId || null,
  });
  await org.save();
  invalidateOrgCache(org._id);
  res.json({ success: true, data: { subscription: org.subscription, state: subscriptionState(org) } });
});

/** POST /api/billing/cancel — access continues until the paid period ends. */
export const cancel = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.orgId);
  if (!org) throw new ApiError(404, 'Organization not found');
  org.subscription.status = 'canceled';
  org.subscription.cancelAtPeriodEnd = true;
  org.subscription.history.push({ event: 'plan_canceled', planId: org.subscription.planId });
  await org.save();
  invalidateOrgCache(org._id);
  res.json({
    success: true,
    message: 'Plan canceled — access continues until the end of your current period.',
    data: { subscription: org.subscription, state: subscriptionState(org) },
  });
});
