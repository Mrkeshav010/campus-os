const express = require('express');
const router = express.Router();
const {
  createFeeQuery,
  getMyFeeQueries,
  getAllFeeQueries,
  replyToFeeQuery,
  resolveFeeQuery,
} = require('../controllers/feeQueryController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('student'), createFeeQuery);
router.get('/my', protect, allowRoles('student'), getMyFeeQueries);
router.get('/', protect, allowRoles('admin'), getAllFeeQueries);
router.post('/:id/reply', protect, allowRoles('student', 'admin'), replyToFeeQuery);
router.patch('/:id/resolve', protect, allowRoles('admin'), resolveFeeQuery);

module.exports = router;