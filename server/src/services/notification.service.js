import Notification from '../models/Notification.js';

/** Create an in-app notification (fire-and-forget safe). */
export async function notify(userId, { title, message, type = 'general', link = '' }) {
  try {
    return await Notification.create({ userId, title, message, type, link });
  } catch (err) {
    console.error('notify() failed:', err.message);
    return null;
  }
}

export async function notifyMany(userIds, payload) {
  return Promise.all(userIds.map((id) => notify(id, payload)));
}
