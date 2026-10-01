const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const groq = require('../config/groq');
const { notify } = require('../services/notification.service');

const MODEL = 'openai/gpt-oss-120b'; // same as aiController.js
const MAX_SELECTIONS = 2; // first pick + one change

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const matches = (exam, user) => {
  if (exam.department && !same(exam.department, user.branch)) return false;
  if (exam.year && Number(exam.year) !== Number(user.year)) return false;
  if (exam.section && !same(exam.section, 'all') && !same(exam.section, user.section)) return false;
  return true;
};

const canManage = (exam, user) => {
  if (user.role === 'admin') return true;
  if (String(exam.createdBy) === String(user._id)) return true;
  return user.role === 'hod' && same(exam.department, user.branch);
};

const safe = (fn) =>
  Promise.resolve()
    .then(fn)
    .catch((e) => console.error('notify failed:', e.message));

// ---------------- AI question generation ----------------
const parseQuestions = (raw) => {
  const cleaned = String(raw || '').replace(/```json|```/gi, '');
  const s = cleaned.indexOf('[');
  const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) return [];
  let arr;
  try {
    arr = JSON.parse(cleaned.slice(s, e + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (q) =>
        q &&
        typeof q.text === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === 'string' && o.trim()) &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
    )
    .map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex }));
};

// AI tends to put the right answer in the same slot, so shuffle
const shuffleOptions = (q) => {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
};

// POST /api/exams/ai-generate  body: { subject, topic, count, marksPerQuestion, difficulty }
// Only returns a PREVIEW. Teacher edits it and then saves with createExam.
const generateQuestions = async (req, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim().slice(0, 100);
    const topic = String(req.body.topic || '').trim().slice(0, 500);
    const difficulty = ['easy', 'medium', 'hard'].includes(req.body.difficulty) ? req.body.difficulty : 'medium';
    const count = Math.min(Math.max(parseInt(req.body.count, 10) || 5, 1), 30);
    const marks = Number(req.body.marksPerQuestion) > 0 ? Number(req.body.marksPerQuestion) : 1;
    if (!topic) return res.status(400).json({ message: 'Please enter the topic' });

    const prompt = `Create ${count} multiple-choice questions for a college class test.
Subject: ${subject || 'General'}
Topic(s): ${topic}
Difficulty: ${difficulty}
Rules:
- Exactly 4 options per question and exactly ONE correct option.
- Questions must be factually correct and unambiguous.
- Write in the same language style as the topic above (English / Hindi / Hinglish).
Return ONLY a JSON array, with no markdown and no explanation, in this format:
[{"text":"question","options":["opt A","opt B","opt C","opt D"],"correctIndex":0}]`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 6000,
      messages: [
        { role: 'system', content: 'You are an expert college exam paper setter. Reply with a JSON array only.' },
        { role: 'user', content: prompt },
      ],
    });

    const questions = parseQuestions(completion.choices[0]?.message?.content)
      .slice(0, count)
      .map((q) => ({ ...shuffleOptions(q), marks }));

    if (!questions.length) {
      return res.status(502).json({ message: 'AI could not make valid questions. Please try again.' });
    }
    res.status(200).json({ questions });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: 'AI is busy. Try again in a minute.' });
    if (error.status === 401) return res.status(500).json({ message: 'AI key is wrong or missing (GROQ_API_KEY).' });
    next(error);
  }
};

// ---------------- Teacher / HOD side ----------------

// POST /api/exams
const createExam = async (req, res, next) => {
  try {
    const { title, subject, section } = req.body;
    const isAdmin = req.user.role === 'admin';
    const department = isAdmin
      ? String(req.body.department || '').trim() || null
      : String(req.user.branch || '').trim();
    if (!isAdmin && !department) return res.status(400).json({ message: 'Your account has no department set' });

    if (!title || !String(title).trim() || !subject || !String(subject).trim()) {
      return res.status(400).json({ message: 'Exam name and subject are required' });
    }
    const duration = parseInt(req.body.durationMinutes, 10);
    if (!(duration >= 1 && duration <= 300)) {
      return res.status(400).json({ message: 'Duration must be between 1 and 300 minutes' });
    }

    const questions = (Array.isArray(req.body.questions) ? req.body.questions : []).map((q) => ({
      text: String(q.text || '').trim(),
      options: (Array.isArray(q.options) ? q.options : []).map((o) => String(o || '').trim()),
      correctIndex: Number(q.correctIndex),
      marks: Number(q.marks) >= 0 ? Number(q.marks) : 1,
    }));
    if (!questions.length) return res.status(400).json({ message: 'Add at least one question' });
    const bad = questions.find(
      (q) =>
        !q.text ||
        q.options.length !== 4 ||
        q.options.some((o) => !o) ||
        !Number.isInteger(q.correctIndex) ||
        q.correctIndex < 0 ||
        q.correctIndex > 3
    );
    if (bad) return res.status(400).json({ message: 'Every question needs text, 4 options and one correct answer' });

    const exam = await Exam.create({
      title: String(title).trim(),
      subject: String(subject).trim(),
      department,
      year: req.body.year ? Number(req.body.year) : null,
      section: section && String(section).trim() ? String(section).trim() : null,
      durationMinutes: duration,
      questions,
      questionCount: questions.length,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Exam published', exam: { _id: exam._id, title: exam.title } });
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/manage  - exams this teacher/HOD manages, with submission counts
const getManagedExams = async (req, res, next) => {
  try {
    let filter = { createdBy: req.user._id };
    if (req.user.role === 'admin') filter = {};
    if (req.user.role === 'hod') filter = { $or: [{ createdBy: req.user._id }, { department: req.user.branch }] };

    const exams = await Exam.find(filter).select('-questions').sort({ createdAt: -1 }).limit(100);
    const ids = exams.map((e) => e._id);
    const counts = await ExamAttempt.aggregate([
      { $match: { exam: { $in: ids } } },
      { $group: { _id: { exam: '$exam', status: '$status' }, n: { $sum: 1 } } },
    ]);
    const get = (id, status) =>
      counts.find((c) => String(c._id.exam) === String(id) && c._id.status === status)?.n || 0;

    res.status(200).json({
      exams: exams.map((e) => ({
        ...e.toObject(),
        inProgress: get(e._id, 'in_progress'),
        submitted: get(e._id, 'submitted'), // waiting for teacher review
        approved: get(e._id, 'approved'),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/exams/:id
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (!canManage(exam, req.user)) return res.status(403).json({ message: 'Not allowed' });
    await ExamAttempt.deleteMany({ exam: exam._id });
    await exam.deleteOne();
    res.status(200).json({ message: 'Exam deleted' });
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/:id/submissions
const getSubmissions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).select('-questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (!canManage(exam, req.user)) return res.status(403).json({ message: 'Not allowed' });

    const attempts = await ExamAttempt.find({ exam: exam._id, status: { $ne: 'in_progress' } })
      .select('studentName rollNumber autoScore finalScore status submittedAt autoSubmitted')
      .sort({ rollNumber: 1 });
    res.status(200).json({ exam, attempts });
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/attempts/:attemptId   - full answer sheet for review
const getAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const exam = await Exam.findById(attempt.exam);
    if (!exam || !canManage(exam, req.user)) return res.status(403).json({ message: 'Not allowed' });

    const review = exam.questions.map((q) => {
      const a = attempt.answers.find((x) => String(x.question) === String(q._id));
      const g = attempt.graded.find((x) => String(x.question) === String(q._id));
      return {
        questionId: q._id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        marks: q.marks,
        selected: a ? a.selected : null,
        awarded: g ? g.awarded : 0,
      };
    });
    res.status(200).json({
      attempt: {
        _id: attempt._id,
        studentName: attempt.studentName,
        rollNumber: attempt.rollNumber,
        status: attempt.status,
        autoScore: attempt.autoScore,
        finalScore: attempt.finalScore,
        autoSubmitted: attempt.autoSubmitted,
        submittedAt: attempt.submittedAt,
        teacherNote: attempt.teacherNote,
      },
      exam: { _id: exam._id, title: exam.title, subject: exam.subject, totalMarks: exam.totalMarks },
      review,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/exams/attempts/:attemptId/approve  body: { overrides: [{questionId, awarded}], note }
const approveAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.status === 'in_progress') {
      return res.status(400).json({ message: 'Student has not submitted yet' });
    }
    const exam = await Exam.findById(attempt.exam);
    if (!exam || !canManage(exam, req.user)) return res.status(403).json({ message: 'Not allowed' });

    const overrides = Array.isArray(req.body.overrides) ? req.body.overrides : [];
    for (const o of overrides) {
      const q = exam.questions.id(o.questionId);
      const g = attempt.graded.find((x) => String(x.question) === String(o.questionId));
      const val = Number(o.awarded);
      if (q && g && Number.isFinite(val)) g.awarded = Math.min(Math.max(val, 0), q.marks);
    }

    attempt.finalScore = attempt.graded.reduce((s, g) => s + g.awarded, 0);
    attempt.status = 'approved';
    attempt.reviewedBy = req.user._id;
    attempt.reviewedAt = new Date();
    attempt.teacherNote = String(req.body.note || '').trim().slice(0, 500);
    await attempt.save();

    await safe(() =>
      notify({
        userId: attempt.student,
        event: 'examResult',
        data: { examId: exam._id, url: '/student/results' },
        title: 'Exam result published',
        body: `${exam.title}: your result is now available`,
        isUrgent: false,
      })
    );

    res.status(200).json({ message: 'Result approved', finalScore: attempt.finalScore });
  } catch (error) {
    next(error);
  }
};

// ---------------- Student side ----------------

// GET /api/exams/student  - exams meant for this student (NO questions)
const getStudentExams = async (req, res, next) => {
  try {
    const all = await Exam.find({ status: 'published' })
      .select('-questions')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    const mine = all.filter((e) => matches(e, req.user));

    const attempts = await ExamAttempt.find({ student: req.user._id, exam: { $in: mine.map((e) => e._id) } }).select(
      'exam status endsAt'
    );
    const exams = mine.map((e) => {
      const a = attempts.find((x) => String(x.exam) === String(e._id));
      return { ...e.toObject(), attemptStatus: a ? a.status : 'not_started' };
    });
    res.status(200).json({ exams });
  } catch (error) {
    next(error);
  }
};

const publicQuestions = (exam) =>
  exam.questions.map((q) => ({ _id: q._id, text: q.text, options: q.options, marks: q.marks }));

// POST /api/exams/:id/start   (also used to resume after a refresh)
const startExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.status !== 'published' || !matches(exam, req.user)) {
      return res.status(404).json({ message: 'Exam not available' });
    }

    let attempt = await ExamAttempt.findOne({ exam: exam._id, student: req.user._id });
    if (attempt && attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'You have already submitted this exam' });
    }
    if (attempt && Date.now() > attempt.endsAt.getTime()) {
      await finalizeAttempt(attempt, exam, true);
      return res.status(409).json({ message: 'Time is over. Your exam was auto-submitted.', autoSubmitted: true });
    }

    if (!attempt) {
      const now = Date.now();
      try {
        attempt = await ExamAttempt.create({
          exam: exam._id,
          student: req.user._id,
          rollNumber: req.user.rollNumber || '',
          studentName: req.user.name,
          startedAt: new Date(now),
          endsAt: new Date(now + exam.durationMinutes * 60 * 1000),
        });
      } catch (e) {
        if (e.code !== 11000) throw e; // double-click: attempt was just created
        attempt = await ExamAttempt.findOne({ exam: exam._id, student: req.user._id });
      }
    }

    const answers = {};
    attempt.answers.forEach((a) => {
      answers[String(a.question)] = { selected: a.selected, selections: a.selections };
    });

    res.status(200).json({
      exam: {
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
      },
      questions: publicQuestions(exam), // correctIndex is NEVER sent
      answers,
      endsAt: attempt.endsAt,
      serverNow: Date.now(), // so the browser timer can correct clock differences
      maxSelections: MAX_SELECTIONS,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/exams/:id/answer   body: { questionId, selected }
const saveAnswer = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const attempt = await ExamAttempt.findOne({ exam: exam._id, student: req.user._id, status: 'in_progress' });
    if (!attempt) return res.status(404).json({ message: 'No running attempt' });

    if (Date.now() > attempt.endsAt.getTime()) {
      await finalizeAttempt(attempt, exam, true);
      return res.status(409).json({ message: 'Time is over. Your exam was auto-submitted.', autoSubmitted: true });
    }

    const q = exam.questions.id(req.body.questionId);
    const selected = Number(req.body.selected);
    if (!q || !Number.isInteger(selected) || selected < 0 || selected >= q.options.length) {
      return res.status(400).json({ message: 'Invalid answer' });
    }

    const existing = attempt.answers.find((a) => String(a.question) === String(q._id));
    if (!existing) {
      attempt.answers.push({ question: q._id, selected, selections: 1 });
    } else {
      if (existing.selected === selected) {
        return res.status(200).json({ selected, selections: existing.selections });
      }
      if (existing.selections >= MAX_SELECTIONS) {
        return res.status(403).json({ message: 'You can change an answer only once', locked: true });
      }
      existing.selected = selected;
      existing.selections += 1;
    }
    await attempt.save();

    const now = attempt.answers.find((a) => String(a.question) === String(q._id));
    res.status(200).json({ selected: now.selected, selections: now.selections, locked: now.selections >= MAX_SELECTIONS });
  } catch (error) {
    next(error);
  }
};

// POST /api/exams/:id/submit
const submitExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const attempt = await ExamAttempt.findOne({ exam: exam._id, student: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'No attempt found' });
    if (attempt.status !== 'in_progress') {
      return res.status(200).json({ message: 'Already submitted' });
    }
    // If the timer had already run out, mark it as auto-submitted
    const timeUp = Date.now() >= attempt.endsAt.getTime() - 3000;
    await finalizeAttempt(attempt, exam, timeUp);
    res.status(200).json({ message: 'Exam submitted. Result will be shown after your teacher approves it.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/results/my
// PRIVACY: filtered by the logged-in student only, never by an id from the client
const getMyResults = async (req, res, next) => {
  try {
    const attempts = await ExamAttempt.find({ student: req.user._id, status: 'approved' })
      .populate('exam')
      .sort({ reviewedAt: -1 });

    const results = attempts
      .filter((a) => a.exam)
      .map((a) => ({
        _id: a._id,
        rollNumber: a.rollNumber,
        studentName: a.studentName,
        exam: { title: a.exam.title, subject: a.exam.subject, totalMarks: a.exam.totalMarks },
        finalScore: a.finalScore,
        percentage: a.exam.totalMarks ? Math.round((a.finalScore / a.exam.totalMarks) * 1000) / 10 : 0,
        teacherNote: a.teacherNote,
        reviewedAt: a.reviewedAt,
        review: a.exam.questions.map((q) => {
          const ans = a.answers.find((x) => String(x.question) === String(q._id));
          const g = a.graded.find((x) => String(x.question) === String(q._id));
          return {
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            selected: ans ? ans.selected : null,
            marks: q.marks,
            awarded: g ? g.awarded : 0,
          };
        }),
      }));
    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

// ---------------- Grading + auto-submit ----------------

// Safe to call many times: only the first call (status in_progress) does the work.
const finalizeAttempt = async (attempt, exam, auto) => {
  const claimed = await ExamAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress' },
    { $set: { status: 'submitted', submittedAt: new Date(), autoSubmitted: auto } },
    { new: true }
  );
  if (!claimed) return null;

  const graded = exam.questions.map((q) => {
    const a = claimed.answers.find((x) => String(x.question) === String(q._id));
    return { question: q._id, awarded: a && a.selected === q.correctIndex ? q.marks : 0 };
  });
  claimed.graded = graded;
  claimed.autoScore = graded.reduce((s, g) => s + g.awarded, 0);
  await claimed.save();

  await safe(() =>
    notify({
      userId: exam.createdBy,
      event: 'examSubmitted',
      data: { examId: exam._id, attemptId: claimed._id, url: `/admin/exams/attempt/${claimed._id}` },
      title: 'Exam submitted',
      body: `${claimed.studentName} (Roll ${claimed.rollNumber || '-'}) completed ${exam.title}${auto ? ' (auto-submitted)' : ''}`,
      isUrgent: false,
    })
  );
  return claimed;
};

// Submits exams whose time ended even if the student closed the browser
const startExamSweeper = () => {
  setInterval(async () => {
    try {
      const due = await ExamAttempt.find({ status: 'in_progress', endsAt: { $lte: new Date() } }).limit(50);
      for (const a of due) {
        const exam = await Exam.findById(a.exam);
        if (exam) await finalizeAttempt(a, exam, true);
      }
    } catch (e) {
      console.error('Exam sweeper error:', e.message);
    }
  }, 20 * 1000);
};

module.exports = {
  generateQuestions,
  createExam,
  getManagedExams,
  deleteExam,
  getSubmissions,
  getAttempt,
  approveAttempt,
  getStudentExams,
  startExam,
  saveAnswer,
  submitExam,
  getMyResults,
  startExamSweeper,
};