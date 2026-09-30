const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['present', 'absent'], required: true },
    markedVia: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession' },
  },
  { timestamps: true }
);

// Prevent the same student being marked twice for the same session
attendanceSchema.index({ student: 1, session: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);