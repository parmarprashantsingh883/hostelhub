import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

export const ASSET_CATEGORIES = ['furniture', 'appliance', 'electronics', 'bedding', 'kitchen', 'safety', 'other'];
export const ASSET_CONDITIONS = ['new', 'good', 'fair', 'damaged'];
export const ASSET_STATUS = ['in_use', 'in_store', 'under_repair', 'retired'];

/** A physical asset in the property (bed, fan, AC, sofa…). Assigned to a room
 *  or a named common location. The register tracks condition, status and value. */
const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    category: { type: String, enum: ASSET_CATEGORIES, default: 'furniture', index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
    location: { type: String, trim: true, maxlength: 80, default: '' }, // when not in a room (e.g. Lobby, Store)
    condition: { type: String, enum: ASSET_CONDITIONS, default: 'good' },
    status: { type: String, enum: ASSET_STATUS, default: 'in_use', index: true },
    quantity: { type: Number, min: 1, default: 1 },
    purchaseDate: { type: Date, default: null },
    purchaseCost: { type: Number, min: 0, default: 0 },
    serialNo: { type: String, trim: true, maxlength: 80, default: '' },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

assetSchema.index({ createdAt: -1 });

assetSchema.plugin(tenantPlugin);

export default mongoose.model('Asset', assetSchema);
