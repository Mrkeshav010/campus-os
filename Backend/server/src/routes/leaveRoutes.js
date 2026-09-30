const express = require('express');
const router = express.Router();
const {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getLeaveHistory,
  reviewLeaveRequest,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('student'), createLeaveRequest);
router.get('/my', protect, allowRoles('student'), getMyLeaveRequests);
router.get('/pending', protect, allowRoles('admin', 'warden', 'hod'), getPendingLeaveRequests);
router.get('/history', protect, allowRoles('admin', 'warden', 'hod'), getLeaveHistory);
router.patch('/:id/review', protect, allowRoles('admin', 'warden', 'hod'), reviewLeaveRequest);

module.exports = router;