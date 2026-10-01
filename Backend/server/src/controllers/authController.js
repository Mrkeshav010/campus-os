const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');

const STAFF_ROLES = ['teacher', 'hod', 'principal', 'vice_principal', 'accounts', 'warden', 'organizer'];
const DEPT_ROLES = ['teacher', 'hod']; // these must belong to a department

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  year: user.year,
  branch: user.branch,
  section: user.section,
  rollNumber: user.rollNumber,
  designation: user.designation,
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Turns "mca" / " MCA " into the official "MCA", or null if it is not a real, active department.
const resolveDepartment = async (name) => {
  if (!name || typeof name !== 'string') return null;
  await Department.seedDefaults();
  const dept = await Department.findOne({
    name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
    isActive: true,
  });
  return dept ? dept.name : null;
};

// POST /api/auth/register
// - student: opens immediately
// - admin: needs ADMIN_SETUP_KEY, opens immediately
// - every other staff role (incl. organizer): created as "pending", NO token is returned
const register = async (req, res, next) => {
  try {
    const { name, password, role, phone, rollNumber, year, section, hostelBlock, adminKey } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();

    if (!name || !name.trim() || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const requestedRole = role || 'student';

    // ---------- Admin (root of trust) ----------
    if (requestedRole === 'admin') {
      if (!process.env.ADMIN_SETUP_KEY || adminKey !== process.env.ADMIN_SETUP_KEY) {
        return res.status(403).json({ message: 'Invalid admin setup key' });
      }
      const admin = await User.create({ name, email, password, role: 'admin', phone });
      return res.status(201).json({ token: generateToken(admin._id), user: userPayload(admin) });
    }

    // ---------- Staff (needs admin approval) ----------
    if (requestedRole !== 'student') {
      if (!STAFF_ROLES.includes(requestedRole)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      let branch;
      if (DEPT_ROLES.includes(requestedRole)) {
        branch = await resolveDepartment(req.body.branch);
        if (!branch) return res.status(400).json({ message: 'Please choose a valid department' });
      }
      let designation;
      if (requestedRole === 'organizer') {
        designation = String(req.body.designation || '').trim();
        if (!designation) {
          return res.status(400).json({ message: 'Please enter your designation (e.g. Cultural Head)' });
        }
      }
      await User.create({
        name,
        email,
        password,
        role: requestedRole,
        phone,
        branch,
        designation,
        approvalStatus: 'pending',
      });
      return res.status(201).json({
        pending: true,
        message: 'Account created. You can log in after the admin approves it.',
      });
    }

    // ---------- Student ----------
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ message: 'Roll number is required' });
    }
    const branch = await resolveDepartment(req.body.branch);
    if (!branch) return res.status(400).json({ message: 'Please choose a valid department' });

    const roll = rollNumber.trim();
    if (await User.findOne({ rollNumber: new RegExp(`^${escapeRegex(roll)}$`, 'i'), role: 'student' })) {
      return res.status(400).json({ message: 'This roll number is already registered' });
    }

    const student = await User.create({
      name,
      email,
      password,
      role: 'student',
      phone,
      rollNumber: roll,
      year,
      branch,
      section,
      hostelBlock,
    });
    res.status(201).json({ token: generateToken(student._id), user: userPayload(student) });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login   body: { identifier, password }  (identifier = email OR roll number)
const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const identifier = String(req.body.identifier || req.body.email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email / roll number and password are required' });
    }

    const user = identifier.includes('@')
      ? await User.findOne({ email: identifier.toLowerCase() })
      : await User.findOne({
          rollNumber: new RegExp(`^${escapeRegex(identifier)}$`, 'i'),
          role: 'student',
        });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        pending: true,
        message: 'Your account is waiting for admin approval. Please try again later.',
      });
    }
    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        message: user.rejectionNote
          ? `Your account request was rejected: ${user.rejectionNote}`
          : 'Your account request was rejected. Contact the admin.',
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account is disabled' });
    }

    res.status(200).json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { register, login, getMe };