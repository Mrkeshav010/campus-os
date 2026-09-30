const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DEFAULTS = ['MCA', 'MBA', 'BCA', 'MCom'];

// First time the app asks for departments, fill in the starter list.
departmentSchema.statics.seedDefaults = async function () {
  if ((await this.countDocuments()) === 0) {
    await this.insertMany(DEFAULTS.map((name) => ({ name })), { ordered: false }).catch(() => {});
  }
};

module.exports = mongoose.model('Department', departmentSchema);