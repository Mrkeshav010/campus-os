const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { generateSessionCode, generateQRImage } = require('../utils/qrGenerator');
const { dayKey, sameSection, calculateAttendance } = require('../utils/attendanceCalc');

const SESSION_EXPIRY_SECONDS = Number(process.env.QR_SESSION_EXPIRY_SECONDS) || 90;

// ---------- helpers ----------
const DAY_MS = 24 * 60 * 60 * 1000;
const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const dayStart = (str) => new Date(`${str}T00:00:00+05:30`); // IST midnight
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const deptRegexOf = (dept) => new RegExp(`^${escapeRegex(dept)}$`, 'i');
const norm = (v) => String(v || '').trim().toLowerCase();
const pct = (p, t) => (t ? Math.round((p / t) * 1000) / 10 : 0);
// HOD: always own department (from token). Admin: ?branch=
const getDept = (req) =>
  String(req.user.role === 'admin' ? req.query.branch || '' : req.user.branch || '').trim();

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

// GET /api/attendance/hod/report?from=YYYY-MM-DD&to=YYYY-MM-DD[&branch=MCA for admin]
// Day-wise classes of ONE department. Student name lists only when from === to.
const getHodReport = async (req, res, next) => {
  try {
    const today = dayKey(new Date());
    const from = isDateStr(req.query.from) ? req.query.from : today;
    const to = isDateStr(req.query.to) ? req.query.to : from;
    if (to < from) {
      return res.status(400).json({ message: '"To" date cannot be before "From" date' });
    }
    if ((dayStart(to) - dayStart(from)) / DAY_MS > 92) {
      return res.status(400).json({ message: 'Please select a range of 3 months or less' });
    }

    const dept = getDept(req);
    if (!dept) return res.status(400).json({ message: 'Department (branch) not set for this account' });
    const re = deptRegexOf(dept);

    const start = dayStart(from);
    const end = new Date(dayStart(to).getTime() + DAY_MS);
    const withLists = from === to;

    // Sessions created by teachers of this department = classes taken by them
    const sessions = (
      await AttendanceSession.find({ createdAt: { $gte: start, $lt: end } })
        .populate('createdBy', 'name branch')
        .sort({ createdAt: 1 })
        .lean()
    ).filter((s) => s.createdBy?.branch && re.test(s.createdBy.branch));

    const empty = {
      from,
      to,
      department: dept,
      totals: { days: 0, classes: 0, present: 0, absent: 0, percentage: 0 },
      days: [],
    };
    if (sessions.length === 0) return res.status(200).json(empty);

    const students = await User.find({ role: 'student', branch: re, isActive: { $ne: false } })
      .select('name rollNumber year section')
      .lean();

    const records = await Attendance.find({
      student: { $in: students.map((s) => s._id) },
      status: 'present',
      date: { $gte: start, $lt: end },
    })
      .select('student subject date')
      .lean();

    // "day|subject" -> set of student ids present (QR and manual both counted)
    const presentMap = new Map();
    for (const r of records) {
      const key = `${dayKey(r.date)}|${norm(r.subject)}`;
      if (!presentMap.has(key)) presentMap.set(key, new Set());
      presentMap.get(key).add(String(r.student));
    }

    // Regenerated QR for same subject/year/section on the same day = ONE class
    const groups = new Map();
    for (const s of sessions) {
      const date = dayKey(s.createdAt);
      const key = `${date}|${norm(s.subject)}|${s.year}|${norm(s.section)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          date,
          subject: s.subject,
          year: s.year,
          section: s.section,
          teacher: s.createdBy?.name || null,
          time: s.createdAt,
        });
      }
    }

    const byDay = new Map();
    for (const g of groups.values()) {
      const classStudents = students.filter(
        (st) => st.year === g.year && sameSection(g.section, st.section)
      );
      const presentSet = presentMap.get(`${g.date}|${norm(g.subject)}`) || new Set();
      const present = [];
      const absent = [];
      for (const st of classStudents) {
        const row = { userId: st._id, name: st.name, rollNumber: st.rollNumber };
        (presentSet.has(String(st._id)) ? present : absent).push(row);
      }
      const cls = {
        subject: g.subject,
        year: g.year,
        section: g.section,
        teacher: g.teacher,
        time: g.time,
        totalStudents: classStudents.length,
        presentCount: present.length,
        absentCount: absent.length,
      };
      if (withLists) {
        cls.present = present;
        cls.absent = absent;
      }
      if (!byDay.has(g.date)) byDay.set(g.date, []);
      byDay.get(g.date).push(cls);
    }

    const days = [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, classes]) => ({
        date,
        classes: classes.sort((a, b) => new Date(a.time) - new Date(b.time)),
        present: classes.reduce((a, c) => a + c.presentCount, 0),
        absent: classes.reduce((a, c) => a + c.absentCount, 0),
      }));

    const present = days.reduce((a, d) => a + d.present, 0);
    const absent = days.reduce((a, d) => a + d.absent, 0);

    res.status(200).json({
      from,
      to,
      department: dept,
      totals: {
        days: days.length,
        classes: days.reduce((a, d) => a + d.classes.length, 0),
        present,
        absent,
        percentage: pct(present, present + absent),
      },
      days,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/hod/student?roll=45[&branch=MCA for admin]
// One student's full attendance. Only students of the HOD's own department.
const getHodStudent = async (req, res, next) => {
  try {
    const dept = getDept(req);
    if (!dept) return res.status(400).json({ message: 'Department (branch) not set for this account' });
    const roll = String(req.query.roll || '').trim();
    if (!roll) return res.status(400).json({ message: 'Roll number is required' });

    const re = deptRegexOf(dept);
    const student = await User.findOne({
      role: 'student',
      rollNumber: new RegExp(`^${escapeRegex(roll)}$`, 'i'),
      branch: re,
    })
      .select('name email rollNumber year section branch')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'No student with this roll number in your department' });
    }

    const sessions = (
      await AttendanceSession.find({ year: student.year })
        .populate('createdBy', 'name branch')
        .lean()
    ).filter(
      (s) => sameSection(s.section, student.section) && s.createdBy?.branch && re.test(s.createdBy.branch)
    );
    const records = await Attendance.find({ student: student._id }).select('subject date status').lean();

    // One entry per "subject on one day"
    const held = new Map();
    for (const s of sessions) {
      const date = dayKey(s.createdAt);
      const key = `${date}|${norm(s.subject)}`;
      if (!held.has(key)) {
        held.set(key, {
          date,
          subject: s.subject,
          teacher: s.createdBy?.name || null,
          time: s.createdAt,
          status: 'absent',
        });
      }
    }
    for (const r of records) {
      const date = dayKey(r.date);
      const key = `${date}|${norm(r.subject)}`;
      let h = held.get(key);
      if (!h) {
        h = { date, subject: r.subject, teacher: null, time: r.date, status: 'absent' };
        held.set(key, h);
      }
      if (r.status === 'present') {
        h.status = 'present';
        h.markedAt = r.date;
      }
    }

    const history = [...held.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || new Date(b.time) - new Date(a.time)
    );

    const bySubject = new Map();
    for (const h of history) {
      const k = norm(h.subject);
      if (!bySubject.has(k)) bySubject.set(k, { subject: h.subject, total: 0, present: 0 });
      const row = bySubject.get(k);
      row.total += 1;
      if (h.status === 'present') row.present += 1;
    }
    const subjects = [...bySubject.values()]
      .map((r) => ({ ...r, absent: r.total - r.present, percentage: pct(r.present, r.total) }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    const total = history.length;
    const present = history.filter((h) => h.status === 'present').length;

    res.status(200).json({
      student: {
        userId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        year: student.year,
        section: student.section,
        branch: student.branch,
      },
      overall: { total, present, absent: total - present, percentage: pct(present, total) },
      subjects,
      history,
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
  getHodReport,
  getHodStudent,
};