const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    teamName: { type: String, required: true, trim: true },
    leader: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: String,
      rollNumber: String,
      email: String,
      phone: String,
    },
    members: [personSchema],
    // Uppercase roll numbers of leader + members. Used to block duplicates.
    rollNumbers: [{ type: String }],

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remark: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// A roll number can be in only ONE team per event (database-level guard)
eventRegistrationSchema.index({ event: 1, rollNumbers: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);