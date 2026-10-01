const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true },
    selected: { type: Number, required: true },
    selections: { type: Number, default: 1 }, // how many times the student set this answer
  },
  { _id: false }
);

const gradedSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true },
    awarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rollNumber: { type: String, default: '' },
    studentName: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
    answers: [answerSchema],
    graded: [gradedSchema],      // per-question marks (auto first, teacher can edit)
    autoScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: null },
    status: { type: String, enum: ['in_progress', 'submitted', 'approved'], default: 'in_progress' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    teacherNote: { type: String, default: '' },
  },
  { timestamps: true }
);

// One attempt per student per exam
attemptSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', attemptSchema);