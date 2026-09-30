const express = require('express');
const router = express.Router();
const { getMy, getClass, getTeachers, createSlot, deleteSlot } = require('../controllers/timetableController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const MANAGERS = ['admin', 'hod'];
const VIEWERS = ['admin', 'hod', 'teacher', 'faculty'];

router.get('/my', protect, allowRoles('student'), getMy);
router.get('/class', protect, allowRoles(...VIEWERS), getClass);
router.get('/teachers', protect, allowRoles(...MANAGERS), getTeachers);
router.post('/', protect, allowRoles(...MANAGERS), createSlot);
router.delete('/:id', protect, allowRoles(...MANAGERS), deleteSlot);

module.exports = router;