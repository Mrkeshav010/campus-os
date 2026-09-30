const express = require('express');
const router = express.Router();
const { upload, createMaterial, getMine, getMyMaterials, deleteMaterial } = require('../controllers/materialController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const UPLOADERS = ['admin', 'teacher', 'hod', 'faculty'];

// multer errors (size / type) come back as a clean 400
const single = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });

router.post('/', protect, allowRoles(...UPLOADERS), single, createMaterial);
router.get('/mine', protect, allowRoles(...UPLOADERS), getMine);
router.get('/my', protect, allowRoles('student'), getMyMaterials);
router.delete('/:id', protect, allowRoles(...UPLOADERS), deleteMaterial);

module.exports = router;