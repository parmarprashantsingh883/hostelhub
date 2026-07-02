import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

/** A soft-deleted record. When something is deleted we snapshot its full
 *  document here (and hard-remove it from its own collection, so existing list
 *  queries need no changes). Restore re-inserts the snapshot. */
const trashSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true }, // e.g. 'Room', 'Asset'
    label: { type: String, default: '' }, // human-readable summary
    originalId: { type: mongoose.Schema.Types.ObjectId, default: null },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // full document snapshot
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, minimize: false },
);

trashSchema.plugin(tenantPlugin);

export default mongoose.model('TrashItem', trashSchema);
