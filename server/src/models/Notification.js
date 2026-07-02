import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['rent_due', 'complaint_update', 'notice', 'payment', 'visitor', 'general'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

notificationSchema.plugin(tenantPlugin);

export default mongoose.model('Notification', notificationSchema);
