const mongoose = require('mongoose');

const TYPES = ['hackathon', 'function', 'workshop', 'seminar', 'notice'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    type: { type: String, enum: TYPES, default: 'notice' },
    date: { type: Date, required: true },
    time: { type: String, trim: true },
    venue: { type: String, trim: true },
    registrationDeadline: { type: Date }, // end of that day (IST)

    posterUrl: { type: String },
    posterPublicId: { type: String },
    posterResourceType: { type: String },
    externalLink: { type: String, trim: true },

    // Who can see it
    audience: {
      admin: { type: Boolean, default: false },
      faculty: { type: Boolean, default: false }, // teachers + HODs
      students: { type: Boolean, default: true },
    },
    // Narrows the student audience. null = everyone on that dimension.
    studentFilter: {
      year: { type: Number, default: null },
      branch: { type: String, default: null },
      section: { type: String, default: null },
    },

    registrationRequired: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1 }, // includes the leader
    maxTeamSize: { type: Number, default: 1 },

    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

eventSchema.index({ postedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.TYPES = TYPES;