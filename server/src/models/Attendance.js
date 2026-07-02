import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenantPlugin.js';

export const ATTENDANCE_STATUS = ['present', 'absent', 'half_day', 'leave'];
export const SHIFTS = ['general', 'morning', 'evening', 'night', 'off'];

/** One attendance record per staff per day (the day doubles as the duty roster
 *  via `shift`). Upserted by (staffId, date). */
const attendanceSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true }, // normalised to start-of-day
    status: { type: String, enum: ATTENDANCE_STATUS, default: 'present' },
    shift: { type: String, enum: SHIFTS, default: 'general' },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

attendanceSchema.plugin(tenantPlugin);

export default mongoose.model('Attendance', attendanceSchema);
