import Asset, { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUS } from '../models/Asset.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { moveToTrash } from '../services/recyclebin.service.js';

/** GET /api/assets?roomId=&category=&status=&condition= (admin/staff) — list + KPIs. */
export const listAssets = asyncHandler(async (req, res) => {
  const { roomId, category, status, condition } = req.query;
  const q = {};
  if (roomId) q.roomId = roomId;
  if (category) q.category = category;
  if (status) q.status = status;
  if (condition) q.condition = condition;

  const assets = await Asset.find(q).populate('roomId', 'roomNumber floor').sort({ createdAt: -1 });

  // KPIs computed across the FULL register (not the filtered view).
  const all = await Asset.find().select('quantity purchaseCost status condition');
  const kpis = {
    count: all.length,
    units: all.reduce((s, a) => s + (a.quantity || 1), 0),
    totalValue: all.reduce((s, a) => s + (a.purchaseCost || 0), 0),
    underRepair: all.filter((a) => a.status === 'under_repair').length,
    retired: all.filter((a) => a.status === 'retired').length,
    damaged: all.filter((a) => a.condition === 'damaged').length,
  };
  res.json({ success: true, data: { assets, kpis } });
});

/** POST /api/assets (admin) */
export const createAsset = asyncHandler(async (req, res) => {
  const { name, category, condition, status } = req.body;
  if (!name) throw new ApiError(400, 'Asset name is required');
  if (category && !ASSET_CATEGORIES.includes(category)) throw new ApiError(422, 'Invalid category');
  if (condition && !ASSET_CONDITIONS.includes(condition)) throw new ApiError(422, 'Invalid condition');
  if (status && !ASSET_STATUS.includes(status)) throw new ApiError(422, 'Invalid status');

  const asset = await Asset.create({
    name,
    category: category || 'furniture',
    roomId: req.body.roomId || null,
    location: req.body.location || '',
    condition: condition || 'good',
    status: status || 'in_use',
    quantity: Math.max(1, Number(req.body.quantity) || 1),
    purchaseDate: req.body.purchaseDate || null,
    purchaseCost: Math.max(0, Number(req.body.purchaseCost) || 0),
    serialNo: req.body.serialNo || '',
    note: req.body.note || '',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { asset: await asset.populate('roomId', 'roomNumber floor') } });
});

/** PUT /api/assets/:id (admin) */
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (req.body.category && !ASSET_CATEGORIES.includes(req.body.category)) throw new ApiError(422, 'Invalid category');
  if (req.body.condition && !ASSET_CONDITIONS.includes(req.body.condition)) throw new ApiError(422, 'Invalid condition');
  if (req.body.status && !ASSET_STATUS.includes(req.body.status)) throw new ApiError(422, 'Invalid status');

  for (const f of ['name', 'category', 'location', 'condition', 'status', 'serialNo', 'note']) {
    if (req.body[f] !== undefined) asset[f] = req.body[f];
  }
  if (req.body.roomId !== undefined) asset.roomId = req.body.roomId || null;
  if (req.body.quantity !== undefined) asset.quantity = Math.max(1, Number(req.body.quantity) || 1);
  if (req.body.purchaseCost !== undefined) asset.purchaseCost = Math.max(0, Number(req.body.purchaseCost) || 0);
  if (req.body.purchaseDate !== undefined) asset.purchaseDate = req.body.purchaseDate || null;
  await asset.save();
  res.json({ success: true, data: { asset: await asset.populate('roomId', 'roomNumber floor') } });
});

/** DELETE /api/assets/:id (admin) */
export const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');
  await moveToTrash({ type: 'Asset', doc: asset, label: asset.name, userId: req.user._id });
  await asset.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
