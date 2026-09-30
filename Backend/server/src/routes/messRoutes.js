const express = require('express');
const router = express.Router();
const {
  upsertDayMenu,
  getWeekMenu,
  rateMeal,
  getMessAnalytics,
} = require('../controllers/messController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('admin'), upsertDayMenu);
router.get('/', protect, getWeekMenu); // any logged-in role can view
router.post('/:day/rate', protect, allowRoles('student'), rateMeal);
router.get('/analytics', protect, allowRoles('admin'), getMessAnalytics);

module.exports = router;