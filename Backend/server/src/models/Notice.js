const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Who sees it: only students, only faculty (teachers + HODs), or both.
    // Old notices have no value stored, so they read as 'students'.
    audience: { type: String, enum: ['students', 'faculty', 'both'], default: 'students' },
    // Narrows the STUDENT audience only. If a field is empty/null it matches everyone.
    targetFilter: {
      year: { type: Number, default: null },
      branch: { type: String, default: null },
      hostelBlock: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);