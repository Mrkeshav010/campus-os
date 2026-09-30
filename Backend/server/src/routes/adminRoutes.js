const express = require('express');
const router = express.Router();
const { listPendingStaff, approveStaff, rejectStaff } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.get('/staff/pending', protect, allowRoles('admin'), listPendingStaff);
router.patch('/staff/:id/approve', protect, allowRoles('admin'), approveStaff);
router.patch('/staff/:id/reject', protect, allowRoles('admin'), rejectStaff);

module.exports = router;