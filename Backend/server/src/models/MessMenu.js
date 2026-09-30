const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    breakfast: { type: String, trim: true },
    lunch: { type: String, trim: true },
    dinner: { type: String, trim: true },
    ratings: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        meal: { type: String, enum: ['breakfast', 'lunch', 'dinner'] },
        rating: { type: Number, min: 1, max: 5 },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MessMenu', messMenuSchema);