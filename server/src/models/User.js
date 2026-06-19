import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Single User collection for all roles (admin / tenant / staff).
 * Role-specific data lives on the embedded tenantProfile / staffProfile
 * sub-documents — keeps auth in one place while letting each role carry
 * its own fields.
 */
const tenantProfileSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    joiningDate: { type: Date },
    moveOutDate: { type: Date, default: null },
    securityDeposit: { type: Number, default: 0, min: 0 },
    rentAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'moved_out'],
      default: 'active',
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    guardianDetails: {
      name: String,
      phone: String,
      address: String,
    },
    idProof: {
      type: { type: String, enum: ['aadhaar', 'passport', 'driving_license', 'voter_id', 'other'] },
      number: String,
    },
  },
  { _id: false },
);

const staffProfileSchema = new mongoose.Schema(
  {
    staffType: {
      type: String,
      enum: ['maintenance', 'cleaning', 'security', 'cook', 'manager'],
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    salary: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    phone: { type: String, trim: true, maxlength: 20 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['admin', 'tenant', 'staff'],
      required: true,
      index: true,
    },
    profileImage: { type: String, default: '' },
    isActive: { type: Boolean, default: true },

    tenantProfile: { type: tenantProfileSchema, default: undefined },
    staffProfile: { type: staffProfileSchema, default: undefined },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.index({ 'tenantProfile.roomId': 1 });
userSchema.index({ 'tenantProfile.status': 1 });

// Hash password on save when modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak secrets when serialising
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.refreshTokenHash;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
