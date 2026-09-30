const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['notes', 'assignment', 'other'], default: 'notes' },
    department: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true, trim: true }, // 'A', 'B' ... or 'All'
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

materialSchema.index({ department: 1, year: 1 });

module.exports = mongoose.model('Material', materialSchema);