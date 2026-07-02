import Organization from '../models/Organization.js';
import { runWithTenant } from '../lib/tenantContext.js';
import { ApiError, asyncHandler } from './error.middleware.js';

/**
 * Public (unauthenticated) endpoints can't derive the org from a user, so the
 * link itself carries it: ?org=<slug>. Resolves + establishes the tenant
 * context for everything downstream. 404s on unknown/deactivated orgs.
 */
export const resolveOrgBySlug = asyncHandler(async (req, _res, next) => {
  const slug = String(req.query.org || '').toLowerCase().trim();
  if (!slug) throw new ApiError(400, 'Missing organization — open the enquiry link your PG shared');
  const org = await Organization.findOne({ slug, isActive: true });
  if (!org) throw new ApiError(404, 'This enquiry link is invalid or no longer active');
  req.org = org;
  return runWithTenant(org._id, next);
});
