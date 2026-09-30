const User = require('../models/User');

// HOD sees only students of their own department. The department comes from
// req.user (set by the token), never from the request body or query.
// Returns a filter for a "student" field, e.g. LeaveRequest.find({ status, ...filter })
const studentScope = async (user) => {
  if (user.role !== 'hod') return {};
  if (!user.branch) return { student: { $in: [] } };
  const ids = await User.find({ role: 'student', branch: user.branch }).distinct('_id');
  return { student: { $in: ids } };
};

module.exports = { studentScope };