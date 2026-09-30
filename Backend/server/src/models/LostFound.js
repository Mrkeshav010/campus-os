const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['lost', 'found'], required: true },
    itemName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    photoUrl: { type: String },
    isClaimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LostFound', lostFoundSchema);