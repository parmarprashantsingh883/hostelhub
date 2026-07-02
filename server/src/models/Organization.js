import mongoose from 'mongoose';

/**
 * A customer organization (one hostel/PG business) — the multi-tenancy root.
 * Every tenant-owned document carries this org's id via the tenant plugin.
 * The SaaS subscription (plan, trial, billing period) lives here, NOT on
 * resident-facing models — residents pay rent, orgs pay for Quarters.
 */
const billingEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    event: { type: String, required: true }, // trial_started | plan_activated | plan_canceled | ...
    planId: { type: String, default: null },
    cycle: { type: String, default: null },
    amount: { type: Number, default: 0 },
    paymentRef: { type: String, default: null },
  },
  { _id: false },
);

const subscriptionSchema = new mongoose.Schema(
  {
    planId: { type: String, default: 'pro' },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled'],
      default: 'trialing',
    },
    cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    gatewayOrderId: { type: String, default: null },
    gatewayPaymentId: { type: String, default: null },
    history: { type: [billingEventSchema], default: [] },
  },
  { _id: false },
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Organization name is required'], trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20 },
    isActive: { type: Boolean, default: true },
    subscription: { type: subscriptionSchema, default: () => ({}) },
  },
  { timestamps: true },
);

/** Derive a unique URL-safe slug from the org name. */
organizationSchema.statics.generateSlug = async function (name) {
  const base =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'org';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await this.exists({ slug })) slug = `${base}-${++n}`;
  return slug;
};

export default mongoose.model('Organization', organizationSchema);
