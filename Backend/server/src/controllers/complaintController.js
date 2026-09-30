const Complaint = require('../models/Complaint');
const groq = require('../config/groq');
const { checkRecurringIssue, getAverageResolutionTime, getRecurringIssueHeatmap } = require('../utils/analyticsAggregator');
const { notify } = require('../services/notification.service');
const User = require('../models/User');

// Uses Groq to classify urgency so admin doesn't have to triage manually.
const classifyPriority = async (description, category) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You classify hostel/campus complaints by urgency. Reply with exactly one word: low, medium, or high.',
        },
        { role: 'user', content: `Category: ${category}. Complaint: ${description}` },
      ],
      max_tokens: 5,
    });
    const answer = completion.choices[0].message.content.trim().toLowerCase();
    return ['low', 'medium', 'high'].includes(answer) ? answer : 'medium';
  } catch (error) {
    console.warn('Groq classification failed, defaulting to medium:', error.message);
    return 'medium';
  }
};

// POST /api/complaints   (student only)
const createComplaint = async (req, res, next) => {
  try {
    const { category, description, location, photoUrl } = req.body;

    const priority = await classifyPriority(description, category);
    const isRecurring = await checkRecurringIssue(location);

    const complaint = await Complaint.create({
      student: req.user.id,
      category,
      description,
      location,
      photoUrl,
      priority,
      isRecurring,
    });

    const admins = await User.find({ role: { $in: ['admin', 'warden'] } });
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin._id,
          event: 'newComplaint',
          data: { complaintId: complaint._id, priority, isRecurring },
          title: `New ${priority}-priority complaint`,
          body: `${category} issue at ${location}${isRecurring ? ' (recurring!)' : ''}`,
          isUrgent: priority === 'high',
          email: admin.email,
        })
      )
    );

    res.status(201).json({ message: 'Complaint submitted', complaint });
  } catch (error) {
    next(error);
  }
};

// GET /api/complaints/my   (student only)
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ complaints });
  } catch (error) {
    next(error);
  }
};

// GET /api/complaints   (admin only) - high priority first, newest first within each level
const getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('student', 'name rollNumber hostelBlock')
      .sort({ createdAt: -1 });

    const rank = { high: 0, medium: 1, low: 2 };
    complaints.sort((a, b) => rank[a.priority] - rank[b.priority]);

    res.status(200).json({ complaints });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/complaints/:id/status   (admin only)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'in-progress' | 'resolved'
    const complaint = await Complaint.findById(req.params.id).populate('student', 'email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.status = status;
    if (status === 'resolved') complaint.resolvedAt = new Date();
    await complaint.save();

    await notify({
      userId: complaint.student._id,
      event: 'complaintStatusUpdate',
      data: { complaintId: complaint._id, status },
      title: 'Complaint status updated',
      body: `Your complaint is now: ${status}`,
      isUrgent: false,
      email: complaint.student.email,
    });

    res.status(200).json({ message: 'Status updated', complaint });
  } catch (error) {
    next(error);
  }
};

// GET /api/complaints/analytics   (admin only)
const getComplaintAnalytics = async (req, res, next) => {
  try {
    const avgResolutionHours = await getAverageResolutionTime();
    const heatmap = await getRecurringIssueHeatmap();
    const pendingCount = await Complaint.countDocuments({ status: { $ne: 'resolved' } });

    res.status(200).json({ avgResolutionHours, heatmap, pendingCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getComplaintAnalytics,
};