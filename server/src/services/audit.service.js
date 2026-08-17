import AuditLog from '../models/AuditLog.js';

/**
 * Record a sensitive action. Best-effort: any failure is swallowed so auditing
 * can never break the request it describes. Pass orgId explicitly for
 * unauthenticated flows (login) where there is no tenant context yet.
 */
export async function recordAudit({ orgId, actorId, actorName, actorRole, action, targetType, targetId, meta, ip }) {
  try {
    await AuditLog.create({
      orgId: orgId || undefined,
      actorId: actorId || null,
      actorName: actorName || '',
      actorRole: actorRole || '',
      action,
      targetType: targetType || '',
      targetId: targetId ? String(targetId) : '',
      meta: meta || {},
      ip: ip || '',
    });
  } catch { /* never break the request */ }
}

/** Convenience for authenticated requests — pulls actor + org + ip from req. */
export function auditReq(req, action, extra = {}) {
  return recordAudit({
    orgId: req.user?.orgId,
    actorId: req.user?._id,
    actorName: req.user?.name,
    actorRole: req.user?.role,
    ip: req.ip,
    action,
    ...extra,
  });
}
