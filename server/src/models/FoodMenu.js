import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meal: { type: String, enum: ['breakfast', 'lunch', 'snacks', 'dinner'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500, default: '' },
    suggestion: { type: String, maxlength: 500, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const foodMenuSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    date: { type: Date, required: true },
    breakfast: { type: String, required: true, maxlength: 300 },
    lunch: { type: String, required: true, maxlength: 300 },
    snacks: { type: String, default: '', maxlength: 300 },
    dinner: { type: String, required: true, maxlength: 300 },
    feedback: [feedbackSchema],
  },
  { timestamps: true },
);

foodMenuSchema.index({ date: -1 }, { unique: true });

// Average rating virtual for quick dashboards
foodMenuSchema.virtual('avgRating').get(function () {
  if (!this.feedback?.length) return null;
  const sum = this.feedback.reduce((s, f) => s + f.rating, 0);
  return Math.round((sum / this.feedback.length) * 10) / 10;
});

foodMenuSchema.set('toJSON', { virtuals: true });

export default mongoose.model('FoodMenu', foodMenuSchema);
