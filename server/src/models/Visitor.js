import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitorName: { type: String, required: true, trim: true, maxlength: 100 },
    visitorPhone: { type: String, required: true, trim: true, maxlength: 20 },
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
    expectedDateTime: { type: Date, required: true },
    entryTime: { type: Date, default: null },
    exitTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['expected', 'checked_in', 'checked_out', 'rejected'],
      default: 'expected',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

visitorSchema.index({ expectedDateTime: -1 });

export default mongoose.model('Visitor', visitorSchema);
