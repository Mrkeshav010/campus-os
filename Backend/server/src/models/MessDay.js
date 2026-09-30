const mongoose = require('mongoose');

const mealSchema = {
  items: { type: String, trim: true, default: '' }, // e.g. "Poha, Tea, Banana"
  time: { type: String, trim: true, default: '' }, // e.g. "7:30 - 9:00 AM"
};

const messDaySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
      unique: true,
    },
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MessDay || mongoose.model('MessDay', messDaySchema);