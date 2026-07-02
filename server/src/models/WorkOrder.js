import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';
import { VENDOR_CATEGORIES } from './Vendor.js';

export const WORKORDER_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

/**
 * A maintenance job. Can be standalone (e.g. scheduled servicing) or raised from
 * a tenant complaint. Assigned to a vendor and/or staff; on completion its cost
 * is logged as a maintenance Expense (the "payables" link to P&L).
 */
const workOrderSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, enum: VENDOR_CATEGORIES, default: 'general', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: WORKORDER_STATUSES, default: 'open', index: true },

    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },

    cost: { type: Number, min: 0, default: 0 },
    scheduledFor: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // Set when completion logged a maintenance expense — prevents double-posting.
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

workOrderSchema.index({ status: 1, createdAt: -1 });

workOrderSchema.plugin(tenantPlugin);

export default mongoose.model('WorkOrder', workOrderSchema);
