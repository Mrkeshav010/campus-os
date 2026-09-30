const express = require('express');
const router = express.Router();
const {
  createSession,
  markAttendance,
  getMyAttendancePercentage,
  getSessionAttendees,
  manualBulkMark,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/session', protect, allowRoles('faculty', 'admin'), createSession);
router.get('/session/:id/attendees', protect, allowRoles('faculty', 'admin'), getSessionAttendees);
router.post('/mark', protect, allowRoles('student'), markAttendance);
router.get('/my-percentage', protect, allowRoles('student'), getMyAttendancePercentage);
router.post('/manual', protect, allowRoles('faculty', 'admin'), manualBulkMark);

module.exports = router;