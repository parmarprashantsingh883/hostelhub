import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

/**
 * Append-only trail of security- and money-sensitive actions, per organization.
 * actorName is denormalized so entries stay readable even if the user is later
 * deleted. Written best-effort — recording an audit must never break a request.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: true },
);

auditLogSchema.plugin(tenantPlugin);
auditLogSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
