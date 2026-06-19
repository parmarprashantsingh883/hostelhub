import Notice from '../models/Notice.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';
import { notifyMany } from '../services/notification.service.js';

/** POST /api/notices (admin) */
export const createNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.create({ ...req.body, createdBy: req.user._id });

  // Push in-app notifications to the target audience
  const roleFilter =
    notice.targetAudience === 'tenants'
      ? { role: 'tenant' }
      : notice.targetAudience === 'staff'
        ? { role: 'staff' }
        : { role: { $in: ['tenant', 'staff'] } };
  const audience = await User.find({ ...roleFilter, isActive: true }).select('_id email');
  await notifyMany(
    audience.map((u) => u._id),
    {
      title: notice.priority === 'urgent' ? `🚨 ${notice.title}` : `Notice: ${notice.title}`,
      message: notice.content.slice(0, 200),
      type: 'notice',
      link: '/notices',
    },
  );

  // Urgent notices also go out by email
  if (notice.priority === 'urgent') {
    const tpl = emailTemplates.urgentNotice(notice.title, notice.content);
    await Promise.all(audience.map((u) => sendEmail({ to: u.email, ...tpl })));
  }

  res.status(201).json({ success: true, data: { notice } });
});

/** GET /api/notices?category=&page=&limit= — audience-filtered for the caller */
export const listNotices = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 50 } = req.query;
  const q = {};
  if (category) q.category = category;
  if (req.user.role === 'tenant') q.targetAudience = { $in: ['all', 'tenants'] };
  if (req.user.role === 'staff') q.targetAudience = { $in: ['all', 'staff'] };

  const [notices, total] = await Promise.all([
    Notice.find(q)
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Notice.countDocuments(q),
  ]);

  res.json({ success: true, data: { notices, total, page: Number(page), limit: Number(limit) } });
});

/** GET /api/notices/:id */
export const getNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id).populate('createdBy', 'name');
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, data: { notice } });
});

/** PUT /api/notices/:id (admin) */
export const updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, data: { notice } });
});

/** DELETE /api/notices/:id (admin) */
export const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, message: 'Notice deleted' });
});
