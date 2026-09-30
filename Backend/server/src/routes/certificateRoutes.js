const express = require('express');
const router = express.Router();
const {
  requestCertificate,
  getMyCertificates,
  getPendingCertificates,
  approveCertificate,
  rejectCertificate,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.post('/', protect, allowRoles('student'), requestCertificate);
router.get('/my', protect, allowRoles('student'), getMyCertificates);
router.get('/pending', protect, allowRoles('admin'), getPendingCertificates);
router.patch('/:id/approve', protect, allowRoles('admin'), approveCertificate);
router.patch('/:id/reject', protect, allowRoles('admin'), rejectCertificate);

module.exports = router;