const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getComplaintAnalytics,
} = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('student'), createComplaint);
router.get('/my', protect, allowRoles('student'), getMyComplaints);
router.get('/', protect, allowRoles('admin', 'warden'), getAllComplaints);
router.get('/analytics', protect, allowRoles('admin', 'warden'), getComplaintAnalytics);
router.patch('/:id/status', protect, allowRoles('admin', 'warden'), updateComplaintStatus);

module.exports = router;