const express = require('express');
const router = express.Router();
const {
  listDepartments,
  listAllDepartments,
  createDepartment,
  setDepartmentActive,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

router.get('/', listDepartments);
router.get('/manage', protect, allowRoles('admin'), listAllDepartments);
router.post('/', protect, allowRoles('admin'), createDepartment);
router.patch('/:id', protect, allowRoles('admin'), setDepartmentActive);

module.exports = router;