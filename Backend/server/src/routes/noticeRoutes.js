const express = require('express');
const router = express.Router();
const {
  createNotice,
  getMyNotices,
  getFacultyNotices,
  getMyPostedNotices,
  getAllNotices,
  deleteNotice,
} = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('admin', 'hod'), createNotice);
router.get('/', protect, allowRoles('student'), getMyNotices);
router.get('/faculty', protect, allowRoles('teacher', 'hod', 'faculty'), getFacultyNotices);
router.get('/mine', protect, allowRoles('hod'), getMyPostedNotices);
router.get('/all', protect, allowRoles('admin'), getAllNotices);
router.delete('/:id', protect, allowRoles('admin', 'hod'), deleteNotice);

module.exports = router;