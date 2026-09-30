const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // faculty
    sessionCode: { type: String, required: true, unique: true }, // encoded in the QR
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);

// Sessions are the record of "classes held", so they must never auto-delete.
// An earlier version had a TTL index that removed them an hour after expiry.
// This drops that old index once (ignored if it no longer exists).
mongoose.connection.once('open', () => {
  AttendanceSession.collection.dropIndex('expiresAt_1').catch(() => {});
});

module.exports = AttendanceSession;