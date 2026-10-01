const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: {
      validator: (v) => v.length === 4 && v.every((o) => o && o.trim()),
      message: 'Each question needs exactly 4 options',
    },
  },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
  marks: { type: Number, default: 1, min: 0 },
});

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    // Who can see/take it (null = everyone on that dimension)
    department: { type: String, trim: true, default: null },
    year: { type: Number, default: null },
    section: { type: String, trim: true, default: null },
    durationMinutes: { type: Number, required: true, min: 1, max: 300 },
    totalMarks: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['published', 'closed'], default: 'published' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);