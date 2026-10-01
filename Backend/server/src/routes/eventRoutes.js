const express = require('express');
const router = express.Router();
const {
  upload,
  createEvent,
  updateEvent,
  deleteEvent,
  myEvents,
  listRegistrations,
  reviewRegistration,
  exportCsv,
  listForMe,
  getOne,
  register,
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const MANAGERS = ['organizer', 'admin'];

// multer errors (size / type) come back as a clean 400
const single = (req, res, next) =>
  upload.single('poster')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });

router.get('/', protect, listForMe);
router.get('/mine', protect, allowRoles(...MANAGERS), myEvents); // must be above '/:id'
router.patch('/registrations/:regId', protect, allowRoles(...MANAGERS), reviewRegistration);

router.post('/', protect, allowRoles(...MANAGERS), single, createEvent);
router.get('/:id', protect, getOne);
router.put('/:id', protect, allowRoles(...MANAGERS), single, updateEvent);
router.delete('/:id', protect, allowRoles(...MANAGERS), deleteEvent);

router.post('/:id/register', protect, allowRoles('student'), register);
router.get('/:id/registrations', protect, allowRoles(...MANAGERS), listRegistrations);
router.get('/:id/registrations/csv', protect, allowRoles(...MANAGERS), exportCsv);

module.exports = router;