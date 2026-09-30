const express = require('express');
const router = express.Router();
const { getMenu, saveMenu } = require('../controllers/messController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

// Students read the menu; only the warden can change it
router.get('/', protect, allowRoles('student', 'warden'), getMenu);
router.put('/', protect, allowRoles('warden'), saveMenu);

module.exports = router;