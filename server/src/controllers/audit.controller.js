import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/** GET /api/audit-logs?action=&page=&limit= (admin) — org's sensitive-action
 *  trail, newest first. Runs in tenant context, so it's org-scoped. */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const filter = {};
  if (req.query.action) filter.action = req.query.action;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('actorId', 'name email role profileImage').lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: { logs, total, page, pages: Math.ceil(total / limit) } });
});
