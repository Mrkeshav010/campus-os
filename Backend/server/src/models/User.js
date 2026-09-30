const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 'faculty' and 'warden' stay in the list so old accounts keep working.
const ROLES = [
  'student',
  'teacher',
  'hod',
  'principal',
  'vice_principal',
  'accounts',
  'admin',
  'faculty',
  'warden',
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ROLES, default: 'student' },
    phone: { type: String, trim: true },
    rollNumber: { type: String, trim: true }, // students only
    year: { type: Number }, // students only
    branch: { type: String, trim: true }, // this is the DEPARTMENT (MCA, MBA...)
    section: { type: String, trim: true },
    hostelBlock: { type: String, trim: true },
    isActive: { type: Boolean, default: true },

    // Staff accounts start as 'pending' and cannot log in until admin approves.
    // Old accounts have no value stored, so they read as 'approved'.
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    rejectionNote: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ rollNumber: 1 });
userSchema.index({ role: 1, branch: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);