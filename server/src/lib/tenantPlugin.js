import mongoose from 'mongoose';
import { getTenantId } from './tenantContext.js';

/**
 * Org-scoping plugin — the multi-tenancy backbone.
 *
 * Applied to every tenant-owned model. Adds an indexed `orgId` and, whenever
 * an ambient tenant context exists (set by `protect` per request):
 *   • stamps orgId on saves / insertMany
 *   • injects an orgId filter into every query (find/update/delete/count/distinct)
 *   • prepends an orgId $match to aggregations
 *
 * Without a context (public routes, auth by id/email, standalone scripts)
 * queries run unscoped — those paths look docs up by unique keys.
 * Opt out per-query with `.setOptions({ skipTenant: true })`.
 */
const QUERY_HOOKS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
  'countDocuments', 'distinct', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne',
];

export function tenantPlugin(schema) {
  schema.add({
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, default: null },
  });

  schema.pre('save', function (next) {
    if (!this.orgId) {
      const org = getTenantId();
      if (org) this.orgId = org;
    }
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    const org = getTenantId();
    if (org && Array.isArray(docs)) {
      for (const d of docs) if (!d.orgId) d.orgId = org;
    }
    next();
  });

  schema.pre(QUERY_HOOKS, function (next) {
    if (this.getOptions()?.skipTenant) return next();
    const org = getTenantId();
    if (!org) return next();
    if (this.getFilter().orgId === undefined) this.where({ orgId: org });
    // Upserted docs must carry the org too (plain-object updates only).
    const update = this.getUpdate?.();
    if (this.getOptions()?.upsert && update && !Array.isArray(update)) {
      this.setUpdate({ ...update, $setOnInsert: { ...(update.$setOnInsert || {}), orgId: org } });
    }
    next();
  });

  schema.pre('aggregate', function (next) {
    if (this.options?.skipTenant) return next();
    const org = getTenantId();
    if (org) this.pipeline().unshift({ $match: { orgId: new mongoose.Types.ObjectId(org) } });
    next();
  });
}
