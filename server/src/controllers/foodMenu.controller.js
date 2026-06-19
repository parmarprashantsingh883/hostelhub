import FoodMenu from '../models/FoodMenu.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

/** POST /api/food-menu (admin) — upsert a day's menu by date */
export const createMenu = asyncHandler(async (req, res) => {
  const { date, day, breakfast, lunch, snacks, dinner } = req.body;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const menu = await FoodMenu.findOneAndUpdate(
    { date: d },
    { date: d, day, breakfast, lunch, snacks: snacks || '', dinner },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ success: true, data: { menu } });
});

/** GET /api/food-menu?from=&to= — defaults to current week */
export const listMenus = asyncHandler(async (req, res) => {
  let { from, to } = req.query;
  if (!from) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    from = monday.toISOString();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    to = sunday.toISOString();
  }
  const q = { date: { $gte: new Date(from) } };
  if (to) q.date.$lt = new Date(to);

  const menus = await FoodMenu.find(q).sort({ date: 1 });
  res.json({ success: true, data: { menus } });
});

/** PUT /api/food-menu/:id (admin) */
export const updateMenu = asyncHandler(async (req, res) => {
  const allowed = ['breakfast', 'lunch', 'snacks', 'dinner', 'day'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const menu = await FoodMenu.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!menu) throw new ApiError(404, 'Menu not found');
  res.json({ success: true, data: { menu } });
});

/** DELETE /api/food-menu/:id (admin) */
export const deleteMenu = asyncHandler(async (req, res) => {
  const menu = await FoodMenu.findByIdAndDelete(req.params.id);
  if (!menu) throw new ApiError(404, 'Menu not found');
  res.json({ success: true, message: 'Menu deleted' });
});

/** POST /api/food-menu/:id/feedback { meal, rating, comment, suggestion } (tenant) */
export const addFeedback = asyncHandler(async (req, res) => {
  const menu = await FoodMenu.findById(req.params.id);
  if (!menu) throw new ApiError(404, 'Menu not found');

  const { meal, rating, comment, suggestion } = req.body;
  // One feedback per tenant per meal per day — replace if exists
  menu.feedback = menu.feedback.filter(
    (f) => !(String(f.tenantId) === String(req.user._id) && f.meal === meal),
  );
  menu.feedback.push({
    tenantId: req.user._id,
    meal,
    rating: Number(rating),
    comment: comment || '',
    suggestion: suggestion || '',
  });
  await menu.save();
  res.json({ success: true, data: { menu } });
});
