const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const User = require('../models/User');
const { notify } = require('../services/notification.service');

const FACULTY_ROLES = ['teacher', 'hod', 'faculty'];
const TYPES = ['hackathon', 'function', 'workshop', 'seminar', 'notice'];

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const norm = (s) => String(s || '').trim().toUpperCase();
const bool = (v) => v === true || v === 'true';
const isEmail = (s) => /^\S+@\S+\.\S+$/.test(s);
const isPhone = (s) => /^[0-9+\-\s]{7,15}$/.test(s);

// ---------- poster upload ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!/\.(png|jpe?g|webp|pdf)$/i.test(file.originalname)) {
      return cb(new Error('Poster must be an image (png/jpg/webp) or a PDF'));
    }
    cb(null, true);
  },
});

const uploadPoster = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'campus-connect/events', public_id: String(Date.now()) },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

const destroyPoster = (event) =>
  event.posterPublicId
    ? cloudinary.uploader
        .destroy(event.posterPublicId, { resource_type: event.posterResourceType || 'image' })
        .catch(() => {})
    : Promise.resolve();

// ---------- helpers ----------
const studentMatches = (filter, user) => {
  const f = filter || {};
  if (f.year && Number(f.year) !== Number(user.year)) return false;
  if (f.branch && !same(f.branch, user.branch)) return false;
  if (f.section && !same(f.section, user.section)) return false;
  return true;
};

const canSee = (event, user) => {
  if (user.role === 'admin') return true;
  if (String(event.postedBy?._id || event.postedBy) === String(user._id)) return true;
  if (user.role === 'student') return event.audience.students && studentMatches(event.studentFilter, user);
  if (FACULTY_ROLES.includes(user.role)) return event.audience.faculty;
  return false;
};

const canManage = (event, user) =>
  user.role === 'admin' || String(event.postedBy) === String(user._id);

const toDate = (d, endOfDay = false) => {
  if (!d) return null;
  const dt = new Date(`${d}T${endOfDay ? '23:59:59' : '00:00:00'}+05:30`);
  return isNaN(dt.getTime()) ? null : dt;
};

// Validates + cleans the form body (works for create and update)
const parseBody = (b) => {
  const title = String(b.title || '').trim();
  const details = String(b.details || '').trim();
  if (!title || !details) return { error: 'Title and details are required' };

  const type = TYPES.includes(b.type) ? b.type : 'notice';
  const date = toDate(b.date);
  if (!date) return { error: 'Please choose a valid event date' };
  const venue = String(b.venue || '').trim();
  if (!venue) return { error: 'Venue is required' };

  const audience = {
    admin: bool(b.audienceAdmin),
    faculty: bool(b.audienceFaculty),
    students: bool(b.audienceStudents),
  };
  if (!audience.admin && !audience.faculty && !audience.students) {
    return { error: 'Choose at least one audience (Admin, Faculty or Students)' };
  }

  const text = (v) => (v && String(v).trim() ? String(v).trim() : null);
  const studentFilter = audience.students
    ? { year: b.year ? Number(b.year) : null, branch: text(b.branch), section: text(b.section) }
    : { year: null, branch: null, section: null };

  const registrationRequired = bool(b.registrationRequired);
  let registrationDeadline = null;
  let minTeamSize = 1;
  let maxTeamSize = 1;
  if (registrationRequired) {
    registrationDeadline = toDate(b.registrationDeadline, true);
    if (!registrationDeadline) return { error: 'Registration last date is required' };
    minTeamSize = Number(b.minTeamSize) || 1;
    maxTeamSize = Number(b.maxTeamSize) || 1;
    if (minTeamSize < 1 || maxTeamSize < minTeamSize || maxTeamSize > 20) {
      return { error: 'Team size is invalid (min must be 1 or more, max must be >= min and <= 20)' };
    }
  }

  const externalLink = String(b.externalLink || '').trim();
  if (externalLink && !/^https?:\/\//i.test(externalLink)) {
    return { error: 'External link must start with http:// or https://' };
  }

  return {
    data: {
      title,
      details,
      type,
      date,
      time: String(b.time || '').trim(),
      venue,
      registrationDeadline,
      externalLink,
      audience,
      studentFilter,
      registrationRequired,
      minTeamSize,
      maxTeamSize,
    },
  };
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// ---------- organizer / admin ----------

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { error, data } = parseBody(req.body);
    if (error) return res.status(400).json({ message: error });

    if (req.file) {
      const r = await uploadPoster(req.file.buffer);
      data.posterUrl = r.secure_url;
      data.posterPublicId = r.public_id;
      data.posterResourceType = r.resource_type;
    }

    const event = await Event.create({ ...data, postedBy: req.user._id });

    // ---- tell the audience ----
    let studentTargets = [];
    let facultyTargets = [];
    let adminTargets = [];

    if (event.audience.students) {
      const students = await User.find({ role: 'student', isActive: true }).select('year branch section');
      studentTargets = students.filter((s) => studentMatches(event.studentFilter, s));
    }
    if (event.audience.faculty) {
      facultyTargets = await User.find({
        role: { $in: FACULTY_ROLES },
        isActive: true,
        approvalStatus: { $nin: ['pending', 'rejected'] },
      }).select('_id');
    }
    if (event.audience.admin) {
      adminTargets = await User.find({ role: 'admin', isActive: true }).select('_id');
    }

    const send = (person, url) =>
      notify({
        userId: person._id,
        event: 'newEvent',
        data: { eventId: event._id, title: event.title, url },
        title: `New ${event.type}`,
        body: event.title,
        isUrgent: false,
      });

    await Promise.allSettled([
      ...studentTargets.map((s) => send(s, '/student/events')),
      ...[...facultyTargets, ...adminTargets]
        .filter((p) => String(p._id) !== String(req.user._id))
        .map((p) => send(p, '/admin/events')),
    ]);

    res.status(201).json({
      message: `Event posted. ${studentTargets.length} student(s), ${facultyTargets.length} faculty notified`,
      event,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManage(event, req.user)) return res.status(403).json({ message: 'Not your event' });

    const { error, data } = parseBody(req.body);
    if (error) return res.status(400).json({ message: error });

    if (req.file) {
      await destroyPoster(event);
      const r = await uploadPoster(req.file.buffer);
      data.posterUrl = r.secure_url;
      data.posterPublicId = r.public_id;
      data.posterResourceType = r.resource_type;
    }

    Object.assign(event, data);
    await event.save();
    res.status(200).json({ message: 'Event updated', event });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id  (also removes its registrations)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManage(event, req.user)) return res.status(403).json({ message: 'Not your event' });

    await destroyPoster(event);
    await EventRegistration.deleteMany({ event: event._id });
    await event.deleteOne();
    res.status(200).json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/mine  -> my events with registration counts
const myEvents = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { postedBy: req.user._id };
    const events = await Event.find(query).sort({ createdAt: -1 }).limit(100).lean();

    const counts = await EventRegistration.aggregate([
      { $match: { event: { $in: events.map((e) => e._id) } } },
      { $group: { _id: { event: '$event', status: '$status' }, n: { $sum: 1 } } },
    ]);
    const map = {};
    counts.forEach((c) => {
      const id = String(c._id.event);
      map[id] = map[id] || { total: 0, pending: 0, approved: 0, rejected: 0 };
      map[id][c._id.status] = c.n;
      map[id].total += c.n;
    });

    res.status(200).json({
      events: events.map((e) => ({
        ...e,
        counts: map[String(e._id)] || { total: 0, pending: 0, approved: 0, rejected: 0 },
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id/registrations
const listRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManage(event, req.user)) return res.status(403).json({ message: 'Not your event' });

    const registrations = await EventRegistration.find({ event: event._id }).sort({ createdAt: -1 });
    const counts = { total: registrations.length, pending: 0, approved: 0, rejected: 0 };
    registrations.forEach((r) => (counts[r.status] += 1));

    res.status(200).json({ event, registrations, counts });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/registrations/:regId   body: { status, remark }
const reviewRegistration = async (req, res, next) => {
  try {
    const reg = await EventRegistration.findById(req.params.regId);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    const event = await Event.findById(reg.event);
    if (!event || !canManage(event, req.user)) {
      return res.status(403).json({ message: 'Not your event' });
    }

    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    reg.status = status;
    reg.remark = String(req.body.remark || '').trim() || undefined;
    reg.reviewedBy = req.user._id;
    reg.reviewedAt = new Date();
    await reg.save();

    await notify({
      userId: reg.leader.user,
      event: 'registrationStatus',
      data: { registrationId: reg._id, eventId: event._id, status, remark: reg.remark, url: '/student/events' },
      title: `Registration ${status}: ${event.title}`,
      body: reg.remark || `Team ${reg.teamName}`,
      isUrgent: false,
    }).catch(() => {});

    res.status(200).json({ message: `Team ${status}`, registration: reg });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id/registrations/csv
const exportCsv = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManage(event, req.user)) return res.status(403).json({ message: 'Not your event' });

    const regs = await EventRegistration.find({ event: event._id }).sort({ createdAt: 1 });
    const maxMembers = regs.reduce((m, r) => Math.max(m, r.members.length), 0);

    const head = ['Team', 'Status', 'Remark', 'Leader name', 'Leader roll no', 'Leader email', 'Leader phone'];
    for (let i = 1; i <= maxMembers; i++) {
      head.push(`Member ${i} name`, `Member ${i} roll no`, `Member ${i} email`, `Member ${i} phone`);
    }
    head.push('Registered at');

    const rows = regs.map((r) => {
      const row = [r.teamName, r.status, r.remark || '', r.leader.name, r.leader.rollNumber, r.leader.email, r.leader.phone];
      for (let i = 0; i < maxMembers; i++) {
        const m = r.members[i];
        row.push(m?.name || '', m?.rollNumber || '', m?.email || '', m?.phone || '');
      }
      row.push(new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      return row;
    });

    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\ufeff' + csv); // BOM so Excel reads it properly
  } catch (error) {
    next(error);
  }
};

// ---------- everyone (role-aware) ----------

// GET /api/events  -> events visible to me
const listForMe = async (req, res, next) => {
  try {
    const all = await Event.find().populate('postedBy', 'name designation').sort({ date: -1 }).limit(200).lean();
    const events = all.filter((e) => canSee(e, req.user));

    if (req.user.role === 'student') {
      const roll = norm(req.user.rollNumber);
      const regs = await EventRegistration.find({
        event: { $in: events.map((e) => e._id) },
        rollNumbers: roll,
      }).lean();
      const byEvent = {};
      regs.forEach((r) => {
        byEvent[String(r.event)] = {
          status: r.status,
          remark: r.remark,
          teamName: r.teamName,
          isLeader: String(r.leader.user) === String(req.user._id),
        };
      });
      events.forEach((e) => (e.myRegistration = byEvent[String(e._id)] || null));
    }

    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id
const getOne = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('postedBy', 'name designation');
    if (!event || !canSee(event, req.user)) return res.status(404).json({ message: 'Event not found' });

    const out = { event };
    if (req.user.role === 'student') {
      out.myRegistration = await EventRegistration.findOne({
        event: event._id,
        rollNumbers: norm(req.user.rollNumber),
      });
      out.me = {
        name: req.user.name,
        rollNumber: req.user.rollNumber,
        email: req.user.email,
        phone: req.user.phone || '',
      };
    }
    res.status(200).json(out);
  } catch (error) {
    next(error);
  }
};

// ---------- student ----------

// POST /api/events/:id/register
// body: { teamName, leaderPhone?, members: [{ name, rollNumber, email, phone }] }
const register = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !canSee(event, req.user)) return res.status(404).json({ message: 'Event not found' });
    if (!event.registrationRequired) {
      return res.status(400).json({ message: 'Registration is not open for this event' });
    }
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: 'The registration deadline has passed' });
    }

    const teamName = String(req.body.teamName || '').trim();
    if (!teamName) return res.status(400).json({ message: 'Team name is required' });

    const leaderRoll = norm(req.user.rollNumber);
    if (!leaderRoll) return res.status(400).json({ message: 'Your profile has no roll number' });

    const leaderPhone = String(req.body.leaderPhone || req.user.phone || '').trim();
    if (!isPhone(leaderPhone)) return res.status(400).json({ message: 'Enter a valid phone number for the leader' });

    const raw = Array.isArray(req.body.members) ? req.body.members : [];
    const members = raw.map((m) => ({
      name: String(m.name || '').trim(),
      rollNumber: norm(m.rollNumber),
      email: String(m.email || '').trim().toLowerCase(),
      phone: String(m.phone || '').trim(),
    }));

    const size = 1 + members.length;
    if (size < event.minTeamSize || size > event.maxTeamSize) {
      return res.status(400).json({
        message: `Team size (including the leader) must be between ${event.minTeamSize} and ${event.maxTeamSize}`,
      });
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name || !m.rollNumber) {
        return res.status(400).json({ message: `Member ${i + 1}: name and roll number are required` });
      }
      if (!isEmail(m.email)) return res.status(400).json({ message: `Member ${i + 1}: enter a valid email` });
      if (!isPhone(m.phone)) return res.status(400).json({ message: `Member ${i + 1}: enter a valid phone number` });
    }

    const rolls = [leaderRoll, ...members.map((m) => m.rollNumber)];
    if (new Set(rolls).size !== rolls.length) {
      return res.status(400).json({ message: 'The same roll number is used twice in your team' });
    }

    const clash = await EventRegistration.findOne({ event: event._id, rollNumbers: { $in: rolls } });
    if (clash) {
      const taken = rolls.filter((r) => clash.rollNumbers.includes(r));
      return res.status(400).json({
        message: `Already registered for this event: ${taken.join(', ')}. One person can be in only one team.`,
      });
    }

    let reg;
    try {
      reg = await EventRegistration.create({
        event: event._id,
        teamName,
        leader: {
          user: req.user._id,
          name: req.user.name,
          rollNumber: leaderRoll,
          email: req.user.email,
          phone: leaderPhone,
        },
        members,
        rollNumbers: rolls,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'You or a team member is already registered for this event' });
      }
      throw err;
    }

    // tell the organizer
    notify({
      userId: event.postedBy,
      event: 'newRegistration',
      data: { eventId: event._id, registrationId: reg._id, url: `/organizer/events/${event._id}/registrations` },
      title: 'New team registered',
      body: `${teamName} → ${event.title}`,
      isUrgent: false,
    }).catch(() => {});

    res.status(201).json({ message: 'Registered. Wait for the organizer to verify your team.', registration: reg });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  createEvent,
  updateEvent,
  deleteEvent,
  myEvents,
  listRegistrations,
  reviewRegistration,
  exportCsv,
  listForMe,
  getOne,
  register,
};