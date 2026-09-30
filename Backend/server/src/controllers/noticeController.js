const Notice = require('../models/Notice');
const User = require('../models/User');
const { notify } = require('../services/notification.service');

const FACULTY_ROLES = ['teacher', 'hod', 'faculty'];
const AUDIENCES = ['students', 'faculty', 'both'];

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// A notice reaches a student only if EVERY filter that was set matches them.
// Unset filters (null) match everyone on that dimension.
const matches = (filter, user) => {
  const f = filter || {};
  if (f.year && Number(f.year) !== Number(user.year)) return false;
  if (f.branch && !same(f.branch, user.branch)) return false;
  if (f.hostelBlock && !same(f.hostelBlock, user.hostelBlock)) return false;
  return true;
};

const cleanFilter = (raw) => {
  const f = raw || {};
  const text = (v) => (v && String(v).trim() ? String(v).trim() : null);
  return {
    year: f.year ? Number(f.year) : null,
    branch: text(f.branch),
    hostelBlock: text(f.hostelBlock),
  };
};

// POST /api/notices   (admin only)
const createNotice = async (req, res, next) => {
  try {
    const { title, body, targetFilter } = req.body;
    if (!title || !title.trim() || !body || !body.trim()) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const audience = AUDIENCES.includes(req.body.audience) ? req.body.audience : 'students';
    const toStudents = audience !== 'faculty';
    const toFaculty = audience !== 'students';

    // Year / branch / hostel only make sense for students
    const filter = toStudents ? cleanFilter(targetFilter) : cleanFilter(null);

    const notice = await Notice.create({
      title: title.trim(),
      body: body.trim(),
      postedBy: req.user._id,
      audience,
      targetFilter: filter,
    });

    let studentTargets = [];
    if (toStudents) {
      const students = await User.find({ role: 'student', isActive: true }).select('year branch hostelBlock');
      studentTargets = students.filter((s) => matches(filter, s));
    }

    let facultyTargets = [];
    if (toFaculty) {
      facultyTargets = await User.find({
        role: { $in: FACULTY_ROLES },
        isActive: true,
        approvalStatus: { $nin: ['pending', 'rejected'] },
      }).select('_id');
    }

    const send = (person, url) =>
      notify({
        userId: person._id,
        event: 'newNotice',
        data: { noticeId: notice._id, title: notice.title, url },
        title: 'New notice',
        body: notice.title,
        isUrgent: false,
      });

    await Promise.allSettled([
      ...studentTargets.map((s) => send(s, '/student/notices')),
      ...facultyTargets.map((f) => send(f, '/admin/notices')),
    ]);

    const parts = [];
    if (toStudents) parts.push(`${studentTargets.length} student${studentTargets.length === 1 ? '' : 's'}`);
    if (toFaculty) parts.push(`${facultyTargets.length} faculty`);

    res.status(201).json({
      message: `Notice posted to ${parts.join(' and ')}`,
      notice,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notices   (student only) - only notices meant for this student
const getMyNotices = async (req, res, next) => {
  try {
    // $ne also matches old notices that have no audience stored
    const all = await Notice.find({ audience: { $ne: 'faculty' } })
      .sort({ createdAt: -1 })
      .limit(100);
    const notices = all.filter((n) => matches(n.targetFilter, req.user));
    res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// GET /api/notices/faculty   (teacher / hod) - notices meant for faculty
const getFacultyNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ audience: { $in: ['faculty', 'both'] } })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// GET /api/notices/all   (admin only)
const getAllNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find().populate('postedBy', 'name').sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notices/:id   (admin only)
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.status(200).json({ message: 'Notice deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createNotice, getMyNotices, getFacultyNotices, getAllNotices, deleteNotice };