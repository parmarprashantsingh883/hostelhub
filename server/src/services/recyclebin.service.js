import TrashItem from '../models/TrashItem.js';
import Room from '../models/Room.js';
import Expense from '../models/Expense.js';
import Lead from '../models/Lead.js';
import Notice from '../models/Notice.js';
import Vendor from '../models/Vendor.js';
import Asset from '../models/Asset.js';

/** Types that support the recycle bin (restore re-inserts into these models). */
export const TRASH_MODELS = { Room, Expense, Lead, Notice, Vendor, Asset };

/** Snapshot a document into the recycle bin before it is hard-deleted. */
export async function moveToTrash({ type, doc, label, userId }) {
  if (!TRASH_MODELS[type] || !doc) return null;
  return TrashItem.create({
    type,
    label: label || type,
    originalId: doc._id,
    data: doc.toObject(),
    deletedBy: userId || null,
  });
}
