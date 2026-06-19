import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/** GET /api/notifications?unread=true&page=&limit= */
export const listNotifications = asyncHandler(async (req, res) => {
  const { unread, page = 1, limit = 30 } = req.query;
  const q = { userId: req.user._id };
  if (unread === 'true') q.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Notification.countDocuments(q),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, data: { notifications, total, unreadCount } });
});

/** PUT /api/notifications/:id/read */
export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true } },
  );
  res.json({ success: true });
});

/** PUT /api/notifications/read-all */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.json({ success: true });
});
