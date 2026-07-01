import Vendor, { VENDOR_CATEGORIES } from '../models/Vendor.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { moveToTrash } from '../services/recyclebin.service.js';

/** GET /api/vendors?category=&active= (admin/staff) */
export const listVendors = asyncHandler(async (req, res) => {
  const { category, active } = req.query;
  const q = {};
  if (category) q.category = category;
  if (active === 'true') q.isActive = true;
  const vendors = await Vendor.find(q).sort({ isActive: -1, name: 1 });
  res.json({ success: true, data: { vendors } });
});

/** POST /api/vendors (admin) */
export const createVendor = asyncHandler(async (req, res) => {
  const { name, category, phone, email, notes } = req.body;
  if (!name) throw new ApiError(400, 'Vendor name is required');
  if (category && !VENDOR_CATEGORIES.includes(category)) throw new ApiError(422, 'Invalid category');
  const vendor = await Vendor.create({ name, category, phone, email, notes, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { vendor } });
});

/** PUT /api/vendors/:id (admin) */
export const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (req.body.category && !VENDOR_CATEGORIES.includes(req.body.category)) throw new ApiError(422, 'Invalid category');
  for (const f of ['name', 'category', 'phone', 'email', 'notes']) {
    if (req.body[f] !== undefined) vendor[f] = req.body[f];
  }
  if (req.body.isActive !== undefined) vendor.isActive = !!req.body.isActive;
  await vendor.save();
  res.json({ success: true, data: { vendor } });
});

/** DELETE /api/vendors/:id (admin) */
export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  await moveToTrash({ type: 'Vendor', doc: vendor, label: vendor.name, userId: req.user._id });
  await vendor.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});
