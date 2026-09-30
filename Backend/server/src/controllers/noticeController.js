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
  if (f.section && !same(f.section, user.section)) return false;
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
    section: text(f.section),
  };
};

// POST /api/notices   (admin, or HOD for their own department)
const createNotice = async (req, res, next) => {
  try {
    const { title, body, targetFilter } = req.body;
    if (!title || !title.trim() || !body || !body.trim()) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const isHod = req.user.role === 'hod';
    const dept = isHod ? String(req.user.branch || '').trim() : null;
    if (isHod && !dept) {
      return res.status(400).json({ message: 'Your account has no department set' });
    }

    const audience = AUDIENCES.includes(req.body.audience) ? req.body.audience : 'students';
    const toStudents = audience !== 'faculty';
    const toFaculty = audience !== 'students';

    // Year / section / branch / hostel only make sense for students
    const filter = toStudents ? cleanFilter(targetFilter) : cleanFilter(null);
    if (isHod && toStudents) {
      filter.branch = dept; // HOD can only reach own department's students
      filter.hostelBlock = null;
    }

    const notice = await Notice.create({
      title: title.trim(),
      body: body.trim(),
      postedBy: req.user._id,
      audience,
      department: dept,
      targetFilter: filter,
    });

    let studentTargets = [];
    if (toStudents) {
      const students = await User.find({ role: 'student', isActive: true }).select(
        'year branch hostelBlock section'
      );
      studentTargets = students.filter((s) => matches(filter, s));
    }

    let facultyTargets = [];
    if (toFaculty) {
      facultyTargets = await User.find({
        role: { $in: FACULTY_ROLES },
        isActive: true,
        approvalStatus: { $nin: ['pending', 'rejected'] },
      }).select('_id branch');
      if (isHod) {
        facultyTargets = facultyTargets.filter(
          (f) => same(f.branch, dept) && String(f._id) !== String(req.user._id)
        );
      }
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
    const all = await Notice.find({ audience: { $ne: 'faculty' } })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    const notices = all.filter((n) => matches(n.targetFilter, req.user));
    res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// GET /api/notices/faculty   (teacher / hod) - notices meant for faculty of THEIR department
const getFacultyNotices = async (req, res, next) => {
  try {
    const all = await Notice.find({ audience: { $in: ['faculty', 'both'] } })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    // department null = admin notice (everyone). Otherwise only same department.
    const notices = all.filter((n) => !n.department || same(n.department, req.user.branch));
    res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// GET /api/notices/mine   (hod) - notices this HOD has posted
const getMyPostedNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ postedBy: req.user._id }).sort({ createdAt: -1 }).limit(50);
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

// DELETE /api/notices/:id   (admin: any, hod: only own)
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    if (req.user.role !== 'admin' && String(notice.postedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can delete only your own notices' });
    }
    await notice.deleteOne();
    res.status(200).json({ message: 'Notice deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotice,
  getMyNotices,
  getFacultyNotices,
  getMyPostedNotices,
  getAllNotices,
  deleteNotice,
};