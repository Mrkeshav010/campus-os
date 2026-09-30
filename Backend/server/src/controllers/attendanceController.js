const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { generateSessionCode, generateQRImage } = require('../utils/qrGenerator');
const { dayKey, sameSection, calculateAttendance } = require('../utils/attendanceCalc');

const SESSION_EXPIRY_SECONDS = Number(process.env.QR_SESSION_EXPIRY_SECONDS) || 90;

// POST /api/attendance/session   (faculty/admin only)
const createSession = async (req, res, next) => {
  try {
    const { subject, section, year } = req.body;
    if (!subject || !section || !year) {
      return res.status(400).json({ message: 'Subject, year and section are required' });
    }

    const sessionCode = generateSessionCode();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_SECONDS * 1000);

    const session = await AttendanceSession.create({
      subject: String(subject).trim(),
      section: String(section).trim(),
      year,
      createdBy: req.user.id,
      sessionCode,
      expiresAt,
    });

    const qrImage = await generateQRImage(sessionCode);

    res.status(201).json({
      sessionId: session._id,
      qrImage,
      expiresAt,
      expiresInSeconds: SESSION_EXPIRY_SECONDS,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/mark   (student only)
// studentId always comes from the JWT (req.user), never from the request body.
const markAttendance = async (req, res, next) => {
  try {
    const { sessionCode } = req.body;

    const session = await AttendanceSession.findOne({ sessionCode, isActive: true });
    if (!session) return res.status(400).json({ message: 'Invalid or inactive session' });
    if (session.expiresAt < new Date()) {
      return res.status(400).json({ message: 'This QR code has expired' });
    }

    if (session.year !== req.user.year || !sameSection(session.section, req.user.section)) {
      return res.status(403).json({ message: 'This QR is for a different year/section' });
    }

    const alreadyMarked = await Attendance.findOne({ student: req.user._id, session: session._id });
    if (alreadyMarked) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // Also covers a regenerated QR for the same class on the same day
    const recent = await Attendance.find({
      student: req.user._id,
      subject: session.subject,
      date: { $gte: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    }).select('date');
    if (recent.some((r) => dayKey(r.date) === dayKey(new Date()))) {
      return res.status(400).json({ message: 'Attendance already marked for this subject today' });
    }

    const record = await Attendance.create({
      student: req.user._id,
      subject: session.subject,
      date: new Date(),
      status: 'present',
      markedVia: 'qr',
      session: session._id,
    });

    res.status(201).json({ message: 'Attendance marked', record });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/my-percentage   (student only)
const getMyAttendancePercentage = async (req, res, next) => {
  try {
    const subjects = await calculateAttendance(req.user);
    res.status(200).json({ subjects });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/session/:id/attendees   (faculty/admin) - who has scanned so far
const getSessionAttendees = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (String(session.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your session' });
    }

    const records = await Attendance.find({ session: session._id })
      .populate('student', 'name rollNumber')
      .sort({ createdAt: 1 });

    res.status(200).json({
      count: records.length,
      students: records.map((r) => ({
        name: r.student?.name,
        rollNumber: r.student?.rollNumber,
        markedAt: r.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/manual   (faculty/admin only) - fallback bulk mark
const manualBulkMark = async (req, res, next) => {
  try {
    // records = [{ studentId, subject, status }, ...]
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'records array is required' });
    }

    const docs = records.map((r) => ({
      student: r.studentId,
      subject: r.subject,
      date: new Date(),
      status: r.status,
      markedVia: 'manual',
    }));

    await Attendance.insertMany(docs);
    res.status(201).json({ message: `${docs.length} records saved` });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/hod/today?date=YYYY-MM-DD&branch=MCA
// HOD: sirf apne department. Admin: ?branch= se koi bhi department.
const getHodDaySummary = async (req, res, next) => {
  try {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')
      ? req.query.date
      : new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const dept = String(req.user.role === 'admin' ? req.query.branch || '' : req.user.branch || '').trim();
    if (!dept) {
      return res.status(400).json({ message: 'Department (branch) not set for this account' });
    }
    const deptRegex = new RegExp(`^${dept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    // 1) Aaj ke sessions, sirf is department ke teachers ke
    const sessions = (
      await AttendanceSession.find({ expiresAt: { $gte: start, $lt: end } })
        .populate('createdBy', 'name branch')
        .sort({ expiresAt: 1 })
        .lean()
    ).filter((s) => s.createdBy?.branch && deptRegex.test(s.createdBy.branch));

    if (sessions.length === 0) {
      return res.status(200).json({ date: dateStr, department: dept, totals: { classes: 0, present: 0, absent: 0 }, classes: [] });
    }

    // 2) Department ke saare students + in sessions ki attendance
    const students = await User.find({ role: 'student', branch: deptRegex, isActive: { $ne: false } })
      .select('name rollNumber year section')
      .lean();
    const records = await Attendance.find({
      session: { $in: sessions.map((s) => s._id) },
      status: 'present',
    })
      .select('student session')
      .lean();

    const sessionToGroup = {};
    const groups = {};

    // 3) Same subject+year+section ke multiple QR ko ek class maano
    for (const s of sessions) {
      const key = `${String(s.subject).trim().toLowerCase()}|${s.year}|${String(s.section).trim().toLowerCase()}`;
      sessionToGroup[String(s._id)] = key;
      if (!groups[key]) {
        groups[key] = {
          subject: s.subject,
          year: s.year,
          section: s.section,
          teacher: s.createdBy?.name,
          firstQrAt: s.expiresAt,
          sessionIds: [],
          presentIds: new Set(),
        };
      }
      groups[key].sessionIds.push(String(s._id));
    }
    for (const r of records) {
      const g = groups[sessionToGroup[String(r.session)]];
      if (g) g.presentIds.add(String(r.student));
    }

    const classes = Object.values(groups).map((g) => {
      const classStudents = students.filter(
        (st) => st.year === g.year && sameSection(g.section, st.section)
      );
      const present = [];
      const absent = [];
      for (const st of classStudents) {
        const row = { userId: st._id, name: st.name, rollNumber: st.rollNumber };
        (g.presentIds.has(String(st._id)) ? present : absent).push(row);
      }
      return {
        subject: g.subject,
        year: g.year,
        section: g.section,
        teacher: g.teacher,
        time: g.firstQrAt,
        totalStudents: classStudents.length,
        presentCount: present.length,
        absentCount: absent.length,
        present,
        absent,
      };
    });

    res.status(200).json({
      date: dateStr,
      department: dept,
      totals: {
        classes: classes.length,
        present: classes.reduce((a, c) => a + c.presentCount, 0),
        absent: classes.reduce((a, c) => a + c.absentCount, 0),
      },
      classes,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  markAttendance,
  getMyAttendancePercentage,
  getSessionAttendees,
  manualBulkMark,
  getHodDaySummary,
};