import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ['general', 'rent', 'maintenance', 'food', 'rules', 'emergency'],
      default: 'general',
      index: true,
    },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    isPinned: { type: Boolean, default: false, index: true },
    targetAudience: {
      type: String,
      enum: ['all', 'tenants', 'staff'],
      default: 'all',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

noticeSchema.index({ isPinned: -1, createdAt: -1 });

export default mongoose.model('Notice', noticeSchema);
