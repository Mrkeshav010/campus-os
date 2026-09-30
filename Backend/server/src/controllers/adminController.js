const User = require('../models/User');

// GET /api/admin/staff/pending   (admin only)
const listPendingStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ approvalStatus: 'pending', role: { $ne: 'student' } })
      .select('-password')
      .sort({ createdAt: 1 });
    res.status(200).json({ staff });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/staff/:id/approve   (admin only)
const approveStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'student') return res.status(404).json({ message: 'Staff account not found' });
    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'This account was already reviewed' });
    }
    user.approvalStatus = 'approved';
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    user.rejectionNote = undefined;
    await user.save();
    res.status(200).json({ message: 'Account approved' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/staff/:id/reject   body: { note }   (admin only)
const rejectStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'student') return res.status(404).json({ message: 'Staff account not found' });
    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'This account was already reviewed' });
    }
    user.approvalStatus = 'rejected';
    user.rejectionNote = (req.body.note || '').trim() || undefined;
    await user.save();
    res.status(200).json({ message: 'Account rejected' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPendingStaff, approveStaff, rejectStaff };