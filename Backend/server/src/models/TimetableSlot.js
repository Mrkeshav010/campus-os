const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true, trim: true }, // 'A', 'B'... or 'All'
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
    },
    session: { type: String, enum: ['before_lunch', 'after_lunch'], required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    teacherName: { type: String, trim: true, default: '' },
    room: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

slotSchema.index({ department: 1, year: 1, semester: 1 });

module.exports =
  mongoose.models.TimetableSlot || mongoose.model('TimetableSlot', slotSchema);