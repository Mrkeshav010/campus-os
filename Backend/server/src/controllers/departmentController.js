const Department = require('../models/Department');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/departments   (public - the signup dropdown uses this)
const listDepartments = async (req, res, next) => {
  try {
    await Department.seedDefaults();
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ departments });
  } catch (error) {
    next(error);
  }
};

// GET /api/departments/manage   (admin) - includes disabled ones
const listAllDepartments = async (req, res, next) => {
  try {
    await Department.seedDefaults();
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({ departments });
  } catch (error) {
    next(error);
  }
};

// POST /api/departments   body: { name }   (admin)
const createDepartment = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Department name is required' });
    if (await Department.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) {
      return res.status(400).json({ message: 'This department already exists' });
    }
    const department = await Department.create({ name });
    res.status(201).json({ department });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/departments/:id   body: { isActive }   (admin)
// Renaming is not allowed on purpose: users store the name, a rename would orphan them.
const setDepartmentActive = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    department.isActive = Boolean(req.body.isActive);
    await department.save();
    res.status(200).json({ department });
  } catch (error) {
    next(error);
  }
};

module.exports = { listDepartments, listAllDepartments, createDepartment, setDepartmentActive };