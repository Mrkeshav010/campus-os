const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['bonafide', 'no-dues', 'character', 'migration'],
      required: true,
    },
    reason: { type: String, trim: true },
    // Set only on approval. It must be sparse: a plain unique index allows just ONE
    // document without this field, so a second pending request would fail.
    certificateId: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionNote: { type: String, trim: true },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

const Certificate = mongoose.model('Certificate', certificateSchema);

// The first version created a NON-sparse unique index. Drop it once, then
// rebuild the correct sparse one (both steps are ignored if nothing to do).
mongoose.connection.once('open', async () => {
  try {
    await Certificate.collection.dropIndex('certificateId_1');
  } catch {
    /* index already correct or collection not created yet */
  }
  Certificate.createIndexes().catch(() => {});
});

module.exports = Certificate;