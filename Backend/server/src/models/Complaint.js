const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['electricity', 'water', 'food', 'cleanliness', 'internet', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true }, // e.g. "Hostel Block A, Room 12"
    photoUrl: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }, // set by Groq
    status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    isRecurring: { type: Boolean, default: false }, // flagged by analyticsAggregator
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);