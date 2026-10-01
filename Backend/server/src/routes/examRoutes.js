const express = require('express');
const router = express.Router();
const c = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const STAFF = ['teacher', 'hod', 'faculty', 'admin'];

// Fixed paths first, then the ones with :id
router.post('/ai-generate', protect, allowRoles(...STAFF), c.generateQuestions);
router.post('/', protect, allowRoles(...STAFF), c.createExam);
router.get('/manage', protect, allowRoles(...STAFF), c.getManagedExams);

router.get('/student', protect, allowRoles('student'), c.getStudentExams);
router.get('/results/my', protect, allowRoles('student'), c.getMyResults);

router.get('/attempts/:attemptId', protect, allowRoles(...STAFF), c.getAttempt);
router.patch('/attempts/:attemptId/approve', protect, allowRoles(...STAFF), c.approveAttempt);

router.post('/:id/start', protect, allowRoles('student'), c.startExam);
router.post('/:id/answer', protect, allowRoles('student'), c.saveAnswer);
router.post('/:id/submit', protect, allowRoles('student'), c.submitExam);

router.get('/:id/submissions', protect, allowRoles(...STAFF), c.getSubmissions);
router.delete('/:id', protect, allowRoles(...STAFF), c.deleteExam);

module.exports = router;