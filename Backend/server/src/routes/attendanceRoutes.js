const express = require('express');
const router = express.Router();
const {
  createSession,
  markAttendance,
  getMyAttendancePercentage,
  getSessionAttendees,
  manualBulkMark,
  getHodDaySummary,
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

// HOD: apne department ki aaj ki classes ka attendance summary
router.get('/hod/today', protect, allowRoles('hod', 'admin'), getHodDaySummary);

module.exports = router;