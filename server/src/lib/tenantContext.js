import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Ambient tenant (organization) context.
 * `protect` establishes it per-request from req.user.orgId; the tenant plugin
 * reads it to scope every query/save. Seed + tests use runWithTenant directly.
 */
const als = new AsyncLocalStorage();

export function runWithTenant(orgId, fn) {
  return als.run({ orgId: orgId?.toString?.() ?? orgId }, fn);
}

export function getTenantId() {
  return als.getStore()?.orgId ?? null;
}
