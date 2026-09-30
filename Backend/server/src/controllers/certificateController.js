const path = require('path');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { generateCertificateId } = require('../utils/certIdGenerator');
const { generateCertificatePDF } = require('../services/pdf.service');
const { notify } = require('../services/notification.service');

const TYPES = ['bonafide', 'no-dues', 'character', 'migration'];

// POST /api/certificates   (student only)
const requestCertificate = async (req, res, next) => {
  try {
    const { type, reason } = req.body;
    if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid certificate type' });

    const open = await Certificate.findOne({ student: req.user._id, type, status: 'pending' });
    if (open) {
      return res.status(400).json({ message: `You already have a pending ${type} request` });
    }

    const cert = await Certificate.create({ student: req.user._id, type, reason });

    const admins = await User.find({ role: 'admin' });
    await Promise.allSettled(
      admins.map((admin) =>
        notify({
          userId: admin._id,
          event: 'newCertificateRequest',
          data: { certId: cert._id, student: req.user.name, type, url: '/admin/certificates' },
          title: 'New certificate request',
          body: `${req.user.name} requested a ${type} certificate`,
          isUrgent: false,
          email: admin.email,
        })
      )
    );

    res.status(201).json({ message: 'Certificate requested', cert });
  } catch (error) {
    next(error);
  }
};

// GET /api/certificates/my   (student only)
const getMyCertificates = async (req, res, next) => {
  try {
    const certs = await Certificate.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ certs });
  } catch (error) {
    next(error);
  }
};

// GET /api/certificates/pending   (admin only)
const getPendingCertificates = async (req, res, next) => {
  try {
    const certs = await Certificate.find({ status: 'pending' })
      .populate('student', 'name rollNumber branch year email')
      .sort({ createdAt: 1 });
    res.status(200).json({ certs });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/certificates/:id/approve   (admin only)
const approveCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id).populate('student');
    if (!cert) return res.status(404).json({ message: 'Certificate request not found' });
    if (cert.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already processed' });
    }

    const certificateId = await generateCertificateId();

    const pdfUrl = await generateCertificatePDF({
      type: cert.type,
      studentName: cert.student.name,
      rollNumber: cert.student.rollNumber,
      branch: cert.student.branch,
      year: cert.student.year,
      reason: cert.reason,
      certificateId,
      signaturePath: path.join(__dirname, '../../assets/signature.png'), // optional
      verifyBaseUrl: `${process.env.CLIENT_URL}/verify`,
    });

    cert.status = 'approved';
    cert.certificateId = certificateId;
    cert.pdfUrl = pdfUrl;
    cert.approvedBy = req.user._id;
    await cert.save();

    await Promise.allSettled([
      notify({
        userId: cert.student._id,
        event: 'certificateApproved',
        data: { certId: cert._id, pdfUrl, url: '/student/certificates' },
        title: 'Your certificate is ready',
        body: `${cert.type} certificate approved. Download it now.`,
        isUrgent: false,
        email: cert.student.email,
      }),
    ]);

    res.status(200).json({ message: 'Certificate approved', cert });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/certificates/:id/reject   (admin only)
const rejectCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id).populate('student', 'name email');
    if (!cert) return res.status(404).json({ message: 'Certificate request not found' });
    if (cert.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already processed' });
    }

    cert.status = 'rejected';
    cert.rejectionNote = (req.body.reason || '').trim();
    await cert.save();

    await Promise.allSettled([
      notify({
        userId: cert.student._id,
        event: 'certificateRejected',
        data: { certId: cert._id, url: '/student/certificates' },
        title: 'Certificate request rejected',
        body: cert.rejectionNote || `Your ${cert.type} request was rejected.`,
        isUrgent: false,
        email: cert.student.email,
      }),
    ]);

    res.status(200).json({ message: 'Request rejected', cert });
  } catch (error) {
    next(error);
  }
};

// GET /api/verify/:certificateId   (PUBLIC - no login needed)
const verifyCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certificateId }).populate(
      'student',
      'name rollNumber branch'
    );
    if (!cert || cert.status !== 'approved') {
      return res.status(404).json({ valid: false, message: 'Certificate not found or not approved' });
    }
    res.status(200).json({
      valid: true,
      certificateId: cert.certificateId,
      college: process.env.COLLEGE_NAME || '',
      student: cert.student.name,
      rollNumber: cert.student.rollNumber,
      branch: cert.student.branch,
      type: cert.type,
      issuedOn: cert.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestCertificate,
  getMyCertificates,
  getPendingCertificates,
  approveCertificate,
  rejectCertificate,
  verifyCertificate,
};