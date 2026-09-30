const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');

// One "class held" = one subject on one calendar day (Indian time)
const dayKey = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const sameSection = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Subject-wise attendance for one student.
// Total classes come from the QR sessions held for the student's year + section
// (plus any manual records), NOT from the student's own rows. Absentees never
// get a row, so counting only their own rows would show everyone at 100%.
const calculateAttendance = async (user) => {
  const sessions = await AttendanceSession.find({ year: user.year }).select('subject section createdAt');
  const records = await Attendance.find({ student: user._id }).select('subject date status');

  const held = {}; // subject -> Set of days a class was held
  const present = {}; // subject -> Set of days this student was present

  sessions
    .filter((s) => sameSection(s.section, user.section))
    .forEach((s) => {
      (held[s.subject] ||= new Set()).add(dayKey(s.createdAt));
    });

  records.forEach((r) => {
    const day = dayKey(r.date);
    (held[r.subject] ||= new Set()).add(day); // a manual record also proves a class was held
    if (r.status === 'present') (present[r.subject] ||= new Set()).add(day);
  });

  return Object.keys(held)
    .sort()
    .map((subject) => {
      const totalClasses = held[subject].size;
      const presentCount = present[subject] ? present[subject].size : 0;
      return {
        subject,
        totalClasses,
        presentCount,
        percentage: Math.round((presentCount / totalClasses) * 1000) / 10,
      };
    });
};

module.exports = { dayKey, sameSection, calculateAttendance };