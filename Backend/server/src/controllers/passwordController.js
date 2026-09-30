const crypto = require('crypto');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const sendEmail = require('../utils/sendEmail');

const OTP_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hashOtp = (otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(otp)).digest('hex');

// identifier = email OR student roll number (same as login)
const findUser = (identifier) =>
  identifier.includes('@')
    ? User.findOne({ email: identifier.toLowerCase() })
    : User.findOne({ rollNumber: new RegExp(`^${escapeRegex(identifier)}$`, 'i'), role: 'student' });

// Same answer whether the account exists or not, so nobody can probe which emails are registered
const GENERIC = { message: 'If this account exists, a 6-digit OTP has been sent to its email.' };

// POST /api/auth/forgot-password   body: { identifier }
const forgotPassword = async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    if (!identifier) return res.status(400).json({ message: 'Enter your email or roll number' });

    const user = await findUser(identifier);
    const allowed =
      user && user.isActive && (!user.approvalStatus || user.approvalStatus === 'approved');
    if (!allowed) return res.status(200).json(GENERIC);

    const existing = await PasswordReset.findOne({ user: user._id });
    if (existing && Date.now() - existing.lastSentAt.getTime() < COOLDOWN_MS) {
      return res.status(200).json(GENERIC); // asked again within a minute
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await PasswordReset.findOneAndUpdate(
      { user: user._id },
      {
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true }
    );

    try {
      await sendEmail({
        to: user.email,
        subject: 'Campus Connect password reset OTP',
        text: `Your OTP is ${otp}. It is valid for ${OTP_MINUTES} minutes. If you did not ask for this, ignore this email.`,
      });
    } catch (err) {
      console.error('Password reset email failed:', err.message);
      // While developing, show the OTP in this terminal so you can still test
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV ONLY] Password reset OTP for ${user.email}: ${otp}`);
      }
    }

    res.status(200).json(GENERIC);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password   body: { identifier, otp, newPassword }
const resetPassword = async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const otp = String(req.body.otp || '').trim();
    const { newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: 'Identifier, OTP and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const invalid = () => res.status(400).json({ message: 'Invalid or expired OTP' });

    const user = await findUser(identifier);
    const record = user ? await PasswordReset.findOne({ user: user._id }) : null;
    if (!record || record.expiresAt < new Date()) return invalid();

    if (record.attempts >= MAX_ATTEMPTS) {
      await record.deleteOne();
      return res.status(400).json({ message: 'Too many wrong attempts. Please request a new OTP.' });
    }

    const given = Buffer.from(hashOtp(otp), 'hex');
    const saved = Buffer.from(record.otpHash, 'hex');
    if (given.length !== saved.length || !crypto.timingSafeEqual(given, saved)) {
      record.attempts += 1;
      await record.save();
      return invalid();
    }

    user.password = newPassword; // hashed by the User model before saving
    await user.save();
    await record.deleteOne();

    res.status(200).json({ message: 'Password changed. You can log in now.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { forgotPassword, resetPassword };