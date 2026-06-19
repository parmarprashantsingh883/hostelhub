import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: [true, 'Room number is required'], trim: true, unique: true },
    floor: { type: Number, required: true, min: 0 },
    roomType: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory'],
      required: true,
    },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    currentOccupancy: { type: Number, default: 0, min: 0 },
    rentAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['vacant', 'partially_occupied', 'occupied', 'maintenance'],
      default: 'vacant',
      index: true,
    },
    assignedTenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    facilities: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

roomSchema.index({ floor: 1, roomType: 1 });

// Keep status consistent with occupancy — unless under maintenance.
roomSchema.pre('save', function (next) {
  if (this.status !== 'maintenance') {
    this.currentOccupancy = this.assignedTenants.length;
    if (this.currentOccupancy === 0) this.status = 'vacant';
    else if (this.currentOccupancy >= this.capacity) this.status = 'occupied';
    else this.status = 'partially_occupied';
  }
  next();
});

export default mongoose.model('Room', roomSchema);
