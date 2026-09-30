const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Material = require('../models/Material');
const User = require('../models/User');
const { notify } = require('../services/notification.service');

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const ALLOWED = /\.(pdf|docx?|pptx?|xlsx?|txt|png|jpe?g|zip)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.test(file.originalname)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

const uploadToCloud = (buffer, originalName) =>
  new Promise((resolve, reject) => {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'campus-connect/materials', public_id: `${Date.now()}-${safe}` },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// POST /api/materials  (teacher / hod / admin)
const createMaterial = async (req, res, next) => {
  try {
    const { title, description, type, department, subject, year, semester, section } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please choose a file' });
    if (!title?.trim() || !department?.trim() || !subject?.trim() || !year || !semester || !section?.trim()) {
      return res.status(400).json({ message: 'Title, department, subject, year, semester and section are required' });
    }

    const result = await uploadToCloud(req.file.buffer, req.file.originalname);

    const material = await Material.create({
      title: title.trim(),
      description: (description || '').trim(),
      type: ['notes', 'assignment', 'other'].includes(type) ? type : 'notes',
      department: department.trim(),
      subject: subject.trim(),
      year: Number(year),
      semester: Number(semester),
      section: section.trim(),
      fileUrl: result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
      uploadedBy: req.user._id,
    });

    // Alert only the students this material is meant for
    const students = await User.find({ role: 'student', isActive: true, year: material.year }).select(
      'branch section'
    );
    const targets = students.filter(
      (s) => same(s.branch, material.department) && (same(material.section, 'all') || same(s.section, material.section))
    );
    await Promise.allSettled(
      targets.map((s) =>
        notify({
          userId: s._id,
          event: 'newMaterial',
          data: { materialId: material._id, title: material.title, url: '/student/materials' },
          title: `New ${material.type}: ${material.subject}`,
          body: material.title,
        })
      )
    );

    res.status(201).json({ message: `Uploaded. ${targets.length} student(s) notified`, material });
  } catch (error) {
    next(error);
  }
};

// GET /api/materials/mine  (uploader's own list)
const getMine = async (req, res, next) => {
  try {
    const materials = await Material.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ materials });
  } catch (error) {
    next(error);
  }
};

// GET /api/materials/my  (student) - only material for their dept + year + section
const getMyMaterials = async (req, res, next) => {
  try {
    const all = await Material.find({ year: req.user.year })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    const materials = all.filter(
      (m) => same(m.department, req.user.branch) && (same(m.section, 'all') || same(m.section, req.user.section))
    );
    res.status(200).json({ materials });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/materials/:id  (own upload, or admin)
const deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    if (req.user.role !== 'admin' && String(material.uploadedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can delete only your own uploads' });
    }
    await cloudinary.uploader.destroy(material.publicId, { resource_type: 'raw' }).catch(() => {});
    await material.deleteOne();
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, createMaterial, getMine, getMyMaterials, deleteMaterial };