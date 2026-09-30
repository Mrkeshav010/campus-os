const express = require('express');
const router = express.Router();
const {
  createSession,
  markAttendance,
  getMyAttendancePercentage,
  getSessionAttendees,
  manualBulkMark,
  getHodReport,
  getHodStudent,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

// Roles that can run a class (same list as the frontend's CAN_QR)
const CLASS_STAFF = ['admin', 'faculty', 'teacher', 'hod'];

router.post('/session', protect, allowRoles(...CLASS_STAFF), createSession);
router.get('/session/:id/attendees', protect, allowRoles(...CLASS_STAFF), getSessionAttendees);
router.post('/mark', protect, allowRoles('student'), markAttendance);
router.get('/my-percentage', protect, allowRoles('student'), getMyAttendancePercentage);
router.post('/manual', protect, allowRoles(...CLASS_STAFF), manualBulkMark);

// HOD dashboard: own department only
router.get('/hod/report', protect, allowRoles('hod', 'admin'), getHodReport);
router.get('/hod/student', protect, allowRoles('hod', 'admin'), getHodStudent);

module.exports = router;