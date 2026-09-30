const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Who sees it: only students, only faculty (teachers + HODs), or both.
    // Old notices have no value stored, so they read as 'students'.
    audience: { type: String, enum: ['students', 'faculty', 'both'], default: 'students' },
    // Set only for HOD notices: limits FACULTY readers to this department.
    // Admin notices leave it null, so they reach every department.
    department: { type: String, default: null },
    // Narrows the STUDENT audience only. If a field is empty/null it matches everyone.
    targetFilter: {
      year: { type: Number, default: null },
      branch: { type: String, default: null },
      hostelBlock: { type: String, default: null },
      section: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);