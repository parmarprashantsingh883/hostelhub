import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
      type: String,
      enum: ['id_proof', 'agreement', 'payment_proof', 'police_verification', 'other'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true, maxlength: 255 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentSchema.plugin(tenantPlugin);

export default mongoose.model('Document', documentSchema);
