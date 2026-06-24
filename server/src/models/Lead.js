import mongoose from 'mongoose';

export const LEAD_SOURCES = ['website', 'walk_in', 'referral', 'social', 'other'];
export const LEAD_STAGES = ['new', 'contacted', 'visit_scheduled', 'token_paid', 'converted', 'lost'];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    source: { type: String, enum: LEAD_SOURCES, default: 'website' },
    budget: { type: Number, min: 0, default: 0 },
    note: { type: String, trim: true, maxlength: 2000, default: '' },
    stage: { type: String, enum: LEAD_STAGES, default: 'new', index: true },
    followUpAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

leadSchema.index({ stage: 1, createdAt: -1 });

export default mongoose.model('Lead', leadSchema);
