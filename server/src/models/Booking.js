import mongoose from 'mongoose';

export const BOOKING_STATUSES = ['reserved', 'confirmed', 'moved_in', 'cancelled'];

/**
 * A reservation that holds a bed in a room for a prospective resident until
 * they move in. The pipeline is: reserved → confirmed (token paid) → moved_in
 * (provisions a tenant + fills the bed) → or cancelled (releases the hold).
 * Connects a Lead to actual occupancy.
 */
const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    moveInDate: { type: Date, required: true },
    rentAmount: { type: Number, min: 0, default: 0 },
    securityDeposit: { type: Number, min: 0, default: 0 },
    tokenAmount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'reserved', index: true },
    // Set when the reservation is moved in and a tenant account is provisioned.
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ status: 1, moveInDate: 1 });

/** A reservation still holds a bed while it is reserved or confirmed. */
export const HOLDING_STATUSES = ['reserved', 'confirmed'];

export default mongoose.model('Booking', bookingSchema);
