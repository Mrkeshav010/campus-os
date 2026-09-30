const express = require('express');
const router = express.Router();
const { askAssistant, generateNaacAudit } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const rateLimiter = require('../middleware/rateLimiter');

// Rate-limited to protect the Groq quota from being spammed
router.post('/ask', protect, allowRoles('student'), rateLimiter(15, 60 * 1000), askAssistant);
router.post(
  '/naac-audit',
  protect,
  allowRoles('admin', 'principal', 'vice_principal', 'hod'),
  rateLimiter(8, 60 * 1000),
  generateNaacAudit
);

module.exports = router;