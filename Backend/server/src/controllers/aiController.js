const groq = require('../config/groq');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const FeeQuery = require('../models/FeeQuery');
const Timetable = require('../models/TimetableSlot');
const Notice = require('../models/Notice');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Certificate = require('../models/Certificate');
const Material = require('../models/Material');
const Department = require('../models/Department');

const MODEL = 'openai/gpt-oss-120b';

/**
 * PRIVACY: tool functions never take an id from the AI. They use the
 * student from the verified JWT (req.user), so one student can never
 * ask the AI for another student's data.
 */
const buildTools = (user) => ({
  getMyAttendance: async () =>
    Attendance.aggregate([
      { $match: { student: user._id } },
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
      {
        $project: {
          subject: '$_id',
          _id: 0,
          percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
        },
      },
    ]),

  getMyLeaveStatus: async () =>
    LeaveRequest.find({ student: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type status fromDate toDate -_id'),

  getMyFeeQueries: async () =>
    FeeQuery.find({ student: user._id }).sort({ createdAt: -1 }).limit(5).select('subject status -_id'),

  getMyTimetable: async () => {
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const all = await Timetable.find({ year: user.year }).select(
      'department section semester day startTime endTime subject teacherName room -_id'
    );
    const mine = all.filter(
      (s) => same(s.department, user.branch) && (same(s.section, 'all') || same(s.section, user.section))
    );
    const latest = Math.max(0, ...mine.map((s) => s.semester));
    return mine.filter((s) => s.semester === latest);
  },

  getMyNotices: async () => {
    const all = await Notice.find({ audience: { $ne: 'faculty' } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title targetFilter createdAt -_id');
    return all
      .filter((n) => {
        const f = n.targetFilter || {};
        if (f.year && Number(f.year) !== Number(user.year)) return false;
        if (f.branch && String(f.branch).toLowerCase() !== String(user.branch || '').toLowerCase()) return false;
        return true;
      })
      .slice(0, 5)
      .map((n) => ({ title: n.title, createdAt: n.createdAt }));
  },
});

const tool = (name, description) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties: {} } },
});

const toolSchemas = [
  tool('getMyAttendance', "The current student's own subject-wise attendance percentage."),
  tool('getMyLeaveStatus', "The current student's own recent leave/gate-pass requests and status."),
  tool('getMyFeeQueries', "The current student's own recent fee queries and status."),
  tool('getMyTimetable', "The current student's own class timetable."),
  tool('getMyNotices', 'The most recent notices meant for the current student.'),
];

const systemPrompt = (u) => `You are "Campus AI", a friendly and smart study assistant inside the Campus Connect app.
You are talking to ${u.name} (${u.branch || 'department not set'}, Year ${u.year || '?'}).

You can help with EVERYTHING related to studies, like a good teacher:
- Explain any concept simply, with examples and analogies. Go deeper if asked.
- Solve problems step by step (maths, programming, DBMS, OS, networks, etc.).
- Write and debug code, and explain it line by line.
- Make notes, summaries, mind-maps, revision points, and practice quizzes.
- Help with assignments, projects, viva questions, exam prep, study plans, and career advice.

Rules:
- Reply in the SAME language the student uses (Hindi, Hinglish or English).
- Use Markdown: short headings, bullet points, and fenced code blocks with a language name.
- Be accurate. If you are not sure, say so. Do not invent facts.
- For their own campus data (attendance, timetable, leave, fee queries, notices), call the provided tools. Never guess these.
- Never discuss or reveal any other student's data. Refuse politely.
- Do not do the student's cheating for them in exams, but do teach them so they can solve it.`;

// Keep only the last few valid turns so the request stays small
const cleanHistory = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

// POST /api/ai/ask   (student only)   body: { messages: [{role, content}] }  or  { question }
const askAssistant = async (req, res, next) => {
  try {
    let history = cleanHistory(req.body.messages);
    if (!history.length && typeof req.body.question === 'string' && req.body.question.trim()) {
      history = [{ role: 'user', content: req.body.question.trim().slice(0, 4000) }];
    }
    if (!history.length || history[history.length - 1].role !== 'user') {
      return res.status(400).json({ message: 'Please type a question' });
    }

    const tools = buildTools(req.user);
    const messages = [{ role: 'system', content: systemPrompt(req.user) }, ...history];
    const base = { model: MODEL, temperature: 0.5, max_tokens: 4000 };

    let completion;
    try {
      completion = await groq.chat.completions.create({
        ...base,
        messages,
        tools: toolSchemas,
        tool_choice: 'auto',
      });
    } catch (err) {
      // Tool-calling can occasionally fail on the model side: answer without tools
      if (err.status === 429 || err.status === 401 || err.status === 404) throw err;
      completion = await groq.chat.completions.create({ ...base, messages });
    }

    let reply = completion.choices[0].message;

    if (reply.tool_calls?.length) {
      // Send back only the fields Groq accepts (the model adds extra ones like "reasoning")
      messages.push({ role: 'assistant', content: reply.content || '', tool_calls: reply.tool_calls });
      for (const call of reply.tool_calls) {
        const fn = tools[call.function.name];
        let result;
        try {
          result = fn ? await fn() : { error: 'Unknown tool' };
        } catch {
          result = { error: 'Could not load this data' };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      completion = await groq.chat.completions.create({ ...base, messages });
      reply = completion.choices[0].message;
    }

    res.status(200).json({ answer: reply.content || 'Sorry, I could not answer that. Please try again.' });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'AI is busy right now. Please try again in a minute.' });
    }
    if (error.status === 401) {
      return res.status(500).json({ message: 'AI key is wrong or missing on the server (GROQ_API_KEY).' });
    }
    if (error.status === 404) {
      return res.status(500).json({ message: 'AI model is not available. Change MODEL in aiController.js.' });
    }
    next(error);
  }
};

const collectNaacSnapshot = async () => {
  const [
    students,
    staff,
    pendingStaff,
    attendanceAgg,
    complaints,
    resolvedComplaints,
    highComplaints,
    pendingLeave,
    approvedLeave,
    pendingCerts,
    issuedCerts,
    notices,
    materials,
    departments,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: { $ne: 'student' }, approvalStatus: { $nin: ['pending', 'rejected'] } }),
    User.countDocuments({ role: { $ne: 'student' }, approvalStatus: 'pending' }),
    Attendance.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
    ]),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: 'resolved' }),
    Complaint.countDocuments({ priority: 'high', status: { $ne: 'resolved' } }),
    LeaveRequest.countDocuments({ status: 'pending' }),
    LeaveRequest.countDocuments({ status: 'approved' }),
    Certificate.countDocuments({ status: 'pending' }),
    Certificate.countDocuments({ status: 'approved' }),
    Notice.countDocuments(),
    Material.countDocuments(),
    Department.countDocuments({ isActive: true }).catch(() => 0),
  ]);

  const att = attendanceAgg[0] || { total: 0, present: 0 };
  const attendancePct = att.total ? Math.round((att.present / att.total) * 1000) / 10 : null;
  const complaintClosePct = complaints ? Math.round((resolvedComplaints / complaints) * 1000) / 10 : null;

  return {
    collegeName: process.env.COLLEGE_NAME || 'Campus OS Institute',
    generatedAt: new Date().toISOString(),
    students,
    staff,
    pendingStaff,
    departments,
    attendanceRecords: att.total,
    attendancePercentage: attendancePct,
    complaints,
    resolvedComplaints,
    openHighPriorityComplaints: highComplaints,
    complaintClosureRate: complaintClosePct,
    pendingLeave,
    approvedLeave,
    pendingCertificates: pendingCerts,
    issuedCertificates: issuedCerts,
    notices,
    studyMaterials: materials,
  };
};

const fallbackNaacReport = (snap) => {
  const att = snap.attendancePercentage ?? 'N/A (no records yet)';
  const close = snap.complaintClosureRate ?? 'N/A';
  return `# NAAC-style Institutional Self-Assessment (draft)

**Institution:** ${snap.collegeName}  
**Generated:** ${new Date(snap.generatedAt).toLocaleString('en-IN')}  
**Mode:** Evidence pack from Campus OS live data (AI narrative unavailable — this is the structured fallback).

## Criterion 1 — Curricular Aspects (indicative score: 2.4 / 4)
- Active academic units/departments on the platform: **${snap.departments}**
- Study materials uploaded: **${snap.studyMaterials}**
- Gap: map programme outcomes (POs/COs) and add internships/feedback loops for a higher grade.

## Criterion 2 — Teaching-Learning and Evaluation (indicative score: ${snap.attendancePercentage != null && snap.attendancePercentage >= 75 ? '3.1' : '2.2'} / 4)
- Enrolled students: **${snap.students}**
- Teaching / admin staff on Campus OS: **${snap.staff}**
- Digital attendance coverage: **${snap.attendanceRecords}** marks · overall presence **${att}%**
- Gap: publish CIE/SEE analytics and slow-learner mentoring logs.

## Criterion 3 — Research, Innovations and Extension (indicative score: 1.8 / 4)
- Not yet captured as first-class objects in Campus OS (projects, patents, NSS/NCC).
- Recommended: add a research/extension module before the next cycle.

## Criterion 4 — Infrastructure and Learning Resources (indicative score: 2.5 / 4)
- Hostel/campus tickets logged: **${snap.complaints}** · closed: **${snap.resolvedComplaints}** (${close}% closure)
- Open high-priority tickets: **${snap.openHighPriorityComplaints}**
- Gap: attach lab/library utilisation and ICT spend evidence.

## Criterion 5 — Student Support and Progression (indicative score: 2.8 / 4)
- Leave / gate-pass pending vs approved: **${snap.pendingLeave}** / **${snap.approvedLeave}**
- Certificates pending vs issued: **${snap.pendingCertificates}** / **${snap.issuedCertificates}**
- Notices published: **${snap.notices}**
- Gap: alumni, placement, and scholarship registers.

## Criterion 6 — Governance, Leadership and Management (indicative score: ${snap.pendingStaff ? '2.3' : '2.9'} / 4)
- Staff accounts awaiting approval: **${snap.pendingStaff}**
- Role-based access (admin / HOD / faculty / accounts) is already in production.

## Criterion 7 — Institutional Values and Best Practices (indicative score: 2.6 / 4)
- Recurring complaint heatmaps and QR attendance are unique digital practices.
- Gap: green campus, gender equity, and code-of-conduct documentation.

## Immediate 30-day compliance sprint
1. Drive attendance capture above 75% on every programme.
2. Close all high-priority complaints within 48 hours.
3. Clear the certificate and leave queues every Friday.
4. Folder evidence PDFs (IQAC minutes, CO-PO mapping) next to this export.

*This draft is for internal IQAC rehearsal. It is not an official NAAC submission.*
`;
};

// POST /api/ai/naac-audit   (admin / principal / VP / HOD)
const generateNaacAudit = async (req, res, next) => {
  try {
    const snapshot = await collectNaacSnapshot();
    const focus = typeof req.body?.focus === 'string' ? req.body.focus.slice(0, 500) : '';

    const userPrompt = `Live campus snapshot (JSON):\n${JSON.stringify(snapshot, null, 2)}
${focus ? `\nIQAC extra instruction: ${focus}` : ''}

Write a NAAC-style self-study draft for this Indian higher-education campus.
Use Markdown with:
- Title + institution + timestamp
- Seven NAAC criteria, each with an indicative score out of 4, 3-5 bullets of evidence from the snapshot, and one gap
- A 30-day action sprint (max 6 items)
- A one-line disclaimer that this is an internal rehearsal, not an official NAAC filing
Be specific with the numbers. Do not invent placements, NIRF rank, or grants that are not in the snapshot.`;

    let report = fallbackNaacReport(snapshot);
    let source = 'snapshot-fallback';

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 3500,
        messages: [
          {
            role: 'system',
            content:
              'You are an IQAC / NAAC mock auditor for Indian colleges. You only use the provided Campus OS metrics. Reply in Markdown.',
          },
          { role: 'user', content: userPrompt },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text && text.length > 200) {
        report = text;
        source = 'groq';
      }
    } catch (err) {
      console.error('NAAC Groq draft failed, using snapshot fallback:', err.message);
    }

    res.status(200).json({ report, snapshot, source });
  } catch (error) {
    next(error);
  }
};

module.exports = { askAssistant, generateNaacAudit };