import TrashItem from '../models/TrashItem.js';
import { TRASH_MODELS } from '../services/recyclebin.service.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

/** GET /api/recyclebin?type= (admin) */
export const listTrash = asyncHandler(async (req, res) => {
  const q = req.query.type ? { type: req.query.type } : {};
  const items = await TrashItem.find(q).populate('deletedBy', 'name').sort({ deletedAt: -1 });
  res.json({ success: true, data: { items, count: items.length } });
});

/** POST /api/recyclebin/:id/restore (admin) — re-insert the snapshot. */
export const restoreTrash = asyncHandler(async (req, res) => {
  const item = await TrashItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  const Model = TRASH_MODELS[item.type];
  if (!Model) throw new ApiError(422, `Cannot restore unknown type "${item.type}"`);

  try {
    // Raw insert preserves the original _id, timestamps and every field.
    await Model.collection.insertOne(item.data);
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'The original record already exists');
    throw err;
  }
  await item.deleteOne();
  res.json({ success: true, data: { restored: true, type: item.type } });
});

/** DELETE /api/recyclebin/:id (admin) — delete forever. */
export const purgeTrash = asyncHandler(async (req, res) => {
  const item = await TrashItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  await item.deleteOne();
  res.json({ success: true, data: { purged: true } });
});

/** DELETE /api/recyclebin (admin) — empty the bin. */
export const emptyTrash = asyncHandler(async (req, res) => {
  const { deletedCount } = await TrashItem.deleteMany({});
  res.json({ success: true, data: { deletedCount } });
});
