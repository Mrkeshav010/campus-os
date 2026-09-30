const TimetableSlot = require('../models/TimetableSlot');
const User = require('../models/User');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Admin can pick any department; everyone else is locked to their own
const deptOf = (req) => (req.user.role === 'admin' ? (req.query.department || req.body?.department) : req.user.branch);

// GET /api/timetable/my   (student)
const getMy = async (req, res, next) => {
  try {
    const all = await TimetableSlot.find({ year: req.user.year });
    const mine = all.filter(
      (s) => same(s.department, req.user.branch) && (same(s.section, 'all') || same(s.section, req.user.section))
    );
    // Show only the latest semester that has been created for this class
    const latest = Math.max(0, ...mine.map((s) => s.semester));
    const slots = mine.filter((s) => s.semester === latest);
    res.status(200).json({ slots, semester: latest || null });
  } catch (error) {
    next(error);
  }
};

// GET /api/timetable/class?department=&year=&semester=&section=   (admin/hod/teacher)
const getClass = async (req, res, next) => {
  try {
    const department = deptOf(req);
    const { year, semester, section } = req.query;
    if (!department || !year || !semester || !section) return res.status(200).json({ slots: [] });
    const slots = await TimetableSlot.find({
      department,
      year: Number(year),
      semester: Number(semester),
      section,
    });
    res.status(200).json({ slots });
  } catch (error) {
    next(error);
  }
};

// GET /api/timetable/teachers   (admin/hod) - names for the teacher box
const getTeachers = async (req, res, next) => {
  try {
    const department = deptOf(req);
    if (!department) return res.status(200).json({ teachers: [] });
    const teachers = await User.find({
      role: { $in: ['teacher', 'hod'] },
      branch: department,
      approvalStatus: { $nin: ['pending', 'rejected'] },
    }).select('name');
    res.status(200).json({ teachers: teachers.map((t) => t.name) });
  } catch (error) {
    next(error);
  }
};

// POST /api/timetable   (admin/hod)
const createSlot = async (req, res, next) => {
  try {
    const department = deptOf(req);
    const { year, semester, section, day, session, startTime, endTime, subject, teacherName, room } = req.body;

    if (!department) return res.status(400).json({ message: 'Department is required' });
    if (!year || !semester || !section) return res.status(400).json({ message: 'Year, semester and section are required' });
    if (!DAYS.includes(day)) return res.status(400).json({ message: 'Pick a valid day' });
    if (!['before_lunch', 'after_lunch'].includes(session)) return res.status(400).json({ message: 'Pick before or after lunch' });
    if (!TIME.test(startTime || '') || !TIME.test(endTime || '')) return res.status(400).json({ message: 'Start and end time are required' });
    if (endTime <= startTime) return res.status(400).json({ message: 'End time must be after start time' });
    if (!subject || !subject.trim()) return res.status(400).json({ message: 'Subject is required' });

    const sameDay = await TimetableSlot.find({ department, year: Number(year), semester: Number(semester), day });
    for (const e of sameDay) {
      const overlap = startTime < e.endTime && endTime > e.startTime;
      if (!overlap) continue;
      if (same(e.section, section) || same(e.section, 'all') || same(section, 'all')) {
        return res.status(400).json({ message: `This class already has ${e.subject} at ${e.startTime}-${e.endTime}` });
      }
      if (teacherName && same(e.teacherName, teacherName)) {
        return res.status(400).json({
          message: `${teacherName} already teaches ${e.subject} (Sec ${e.section}) at ${e.startTime}-${e.endTime}`,
        });
      }
    }

    const slot = await TimetableSlot.create({
      department,
      year: Number(year),
      semester: Number(semester),
      section: String(section).trim(),
      day,
      session,
      startTime,
      endTime,
      subject: subject.trim(),
      teacherName: (teacherName || '').trim(),
      room: (room || '').trim(),
      createdBy: req.user._id,
    });
    res.status(201).json({ message: 'Class added', slot });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/timetable/:id   (admin/hod of that department)
const deleteSlot = async (req, res, next) => {
  try {
    const slot = await TimetableSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Class not found' });
    if (req.user.role !== 'admin' && !same(slot.department, req.user.branch)) {
      return res.status(403).json({ message: 'This is not your department' });
    }
    await slot.deleteOne();
    res.status(200).json({ message: 'Removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMy, getClass, getTeachers, createSlot, deleteSlot };