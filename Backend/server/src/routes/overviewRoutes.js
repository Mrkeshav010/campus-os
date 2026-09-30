const express = require('express');
const router = express.Router();
const { getOverview, getDetails } = require('../controllers/overviewController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const ROLES = ['principal', 'vice_principal', 'hod', 'admin'];

router.get('/', protect, allowRoles(...ROLES), getOverview);
router.get('/details', protect, allowRoles(...ROLES), getDetails);

module.exports = router;