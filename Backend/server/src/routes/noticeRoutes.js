const express = require('express');
const router = express.Router();
const {
  createNotice,
  getMyNotices,
  getFacultyNotices,
  getAllNotices,
  deleteNotice,
} = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('admin'), createNotice);
router.get('/', protect, allowRoles('student'), getMyNotices);
router.get('/faculty', protect, allowRoles('teacher', 'hod', 'faculty'), getFacultyNotices);
router.get('/all', protect, allowRoles('admin'), getAllNotices);
router.delete('/:id', protect, allowRoles('admin'), deleteNotice);

module.exports = router;