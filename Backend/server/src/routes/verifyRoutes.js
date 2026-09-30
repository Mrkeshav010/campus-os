const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/certificateController');

// Public route: /api/verify/CERT-2026-00234  (no protect middleware)
router.get('/:certificateId', verifyCertificate);

module.exports = router;