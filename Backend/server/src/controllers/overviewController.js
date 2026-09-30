const User = require('../models/User');
const Department = require('../models/Department');
const LeaveRequest = require('../models/LeaveRequest');
const Material = require('../models/Material');

// GET /api/overview   (principal, vice_principal, hod, admin) - read only
// HOD gets only their own department (taken from the token). Others get all.
const getOverview = async (req, res, next) => {
  try {
    let names;
    if (req.user.role === 'hod') {
      names = [req.user.branch].filter(Boolean);
    } else {
      await Department.seedDefaults();
      names = (await Department.find({ isActive: true }).sort({ name: 1 })).map((d) => d.name);
    }

    const departments = await Promise.all(
      names.map(async (name) => {
        const studentIds = await User.find({ role: 'student', branch: name }).distinct('_id');
        const [teachers, pendingLeave] = await Promise.all([
          User.countDocuments({
            role: { $in: ['teacher', 'hod'] },
            branch: name,
            approvalStatus: { $nin: ['pending', 'rejected'] },
          }),
          LeaveRequest.countDocuments({ status: 'pending', student: { $in: studentIds } }),
        ]);
        return { name, students: studentIds.length, teachers, pendingLeave };
      })
    );

    const totals = departments.reduce(
      (t, d) => ({
        students: t.students + d.students,
        teachers: t.teachers + d.teachers,
        pendingLeave: t.pendingLeave + d.pendingLeave,
      }),
      { students: 0, teachers: 0, pendingLeave: 0 }
    );

    const payload = { departments, totals };
    if (req.user.role === 'admin') {
      payload.pendingStaff = await User.countDocuments({ approvalStatus: 'pending', role: { $ne: 'student' } });
    }
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// GET /api/overview/details?type=students|teachers|leave   (same roles as overview)
// HOD is locked to their own department. Others see all departments.
const getDetails = async (req, res, next) => {
  try {
    const { type } = req.query;
    const branchFilter = req.user.role === 'hod' ? { branch: req.user.branch } : {};

    if (type === 'students') {
      const students = await User.find({ role: 'student', ...branchFilter })
        .select('name email rollNumber year section branch')
        .sort({ branch: 1, year: 1, name: 1 });
      return res.status(200).json({ students });
    }

    if (type === 'teachers') {
      const teachers = await User.find({
        role: { $in: ['teacher', 'hod'] },
        approvalStatus: { $nin: ['pending', 'rejected'] },
        ...branchFilter,
      })
        .select('name email phone role branch')
        .sort({ branch: 1, name: 1 })
        .lean();

      // Subjects = whatever the teacher has uploaded study material for
      const mats = await Material.find({ uploadedBy: { $in: teachers.map((t) => t._id) } }).select(
        'uploadedBy subject'
      );
      const map = {};
      mats.forEach((m) => {
        const k = String(m.uploadedBy);
        map[k] = map[k] || new Set();
        map[k].add(m.subject);
      });
      const result = teachers.map((t) => ({ ...t, subjects: [...(map[String(t._id)] || [])] }));
      return res.status(200).json({ teachers: result });
    }

    if (type === 'leave') {
      const studentIds = await User.find({ role: 'student', ...branchFilter }).distinct('_id');
      const leaves = await LeaveRequest.find({ status: 'pending', student: { $in: studentIds } })
        .populate('student', 'name rollNumber year branch section')
        .sort({ priority: -1, createdAt: 1 });
      return res.status(200).json({ leaves });
    }

    res.status(400).json({ message: 'type must be students, teachers or leave' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getDetails };