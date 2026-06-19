import mongoose from 'mongoose';

export const COMPLAINT_CATEGORIES = [
  'electricity',
  'water',
  'cleaning',
  'wifi',
  'food',
  'furniture',
  'security',
  'maintenance',
  'other',
];

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'resolved', 'rejected'],
      default: 'pending',
      index: true,
    },
    images: [{ type: String }],
    adminRemarks: { type: String, default: '', maxlength: 1000 },
    staffNotes: [
      {
        note: { type: String, maxlength: 1000 },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    tenantFeedback: { type: String, default: '', maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

complaintSchema.index({ createdAt: -1 });

export default mongoose.model('Complaint', complaintSchema);
