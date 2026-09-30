const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { notify } = require('../services/notification.service');
const { studentScope } = require('../utils/scope');

// POST /api/leave   (student only)
const createLeaveRequest = async (req, res, next) => {
  try {
    const { type, reason, fromDate, toDate, priority } = req.body;

    if (!['leave', 'gatepass'].includes(type)) {
      return res.status(400).json({ message: 'Type must be leave or gatepass' });
    }
    if (!reason || !reason.trim() || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Reason, from and to are required' });
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ message: 'End cannot be before start' });
    }

    const leave = await LeaveRequest.create({
      student: req.user._id,
      type,
      reason: reason.trim(),
      fromDate,
      toDate,
      priority: priority === 'urgent' ? 'urgent' : 'normal',
    });

    // Tell every admin/warden AND the HOD of this student's department:
    // socket (if online) + web push (if subscribed).
    // Email goes out only for urgent requests. A failed notification never fails the request.
    const recipientFilter = { role: { $in: ['admin', 'warden'] } };
    const recipients = await User.find({
      approvalStatus: { $nin: ['pending', 'rejected'] },
      $or: [
        recipientFilter,
        ...(req.user.branch ? [{ role: 'hod', branch: req.user.branch }] : []),
      ],
    });
    await Promise.allSettled(
      recipients.map((person) =>
        notify({
          userId: person._id,
          event: 'newLeaveRequest',
          data: {
            leaveId: leave._id,
            student: req.user.name,
            type,
            priority: leave.priority,
            url: '/admin/requests',
          },
          title: `New ${type} request${leave.priority === 'urgent' ? ' (URGENT)' : ''}`,
          body: `${req.user.name}: ${leave.reason}`,
          isUrgent: leave.priority === 'urgent',
          email: person.email,
        })
      )
    );

    res.status(201).json({ message: 'Request submitted', leave });
  } catch (error) {
    next(error);
  }
};

// GET /api/leave/my   (student only)
const getMyLeaveRequests = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

// GET /api/leave/pending   (admin/warden/hod) - urgent first, then oldest first
// HOD only gets students of their own department.
const getPendingLeaveRequests = async (req, res, next) => {
  try {
    const scope = await studentScope(req.user);
    const leaves = await LeaveRequest.find({ status: 'pending', ...scope })
      .populate('student', 'name rollNumber year branch section')
      .sort({ priority: -1, createdAt: 1 });
    res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

// GET /api/leave/history   (admin/warden/hod) - last 30 decisions
const getLeaveHistory = async (req, res, next) => {
  try {
    const scope = await studentScope(req.user);
    const leaves = await LeaveRequest.find({ status: { $ne: 'pending' }, ...scope })
      .populate('student', 'name rollNumber')
      .populate('reviewedBy', 'name')
      .sort({ updatedAt: -1 })
      .limit(30);
    res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/leave/:id/review   (admin/warden/hod)
const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('student', 'name email branch');
    if (!leave) return res.status(404).json({ message: 'Request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already reviewed' });
    }

    // A HOD can only decide on their own department's students
    if (req.user.role === 'hod' && leave.student.branch !== req.user.branch) {
      return res.status(403).json({ message: 'This student is not in your department' });
    }

    leave.status = status;
    leave.reviewNote = reviewNote;
    leave.reviewedBy = req.user._id;
    await leave.save();

    // Live status update straight to that one student
    await Promise.allSettled([
      notify({
        userId: leave.student._id,
        event: 'leaveStatusUpdate',
        data: { leaveId: leave._id, status, url: '/student/leave' },
        title: `Your ${leave.type} request was ${status}`,
        body: reviewNote || `Reviewed by ${req.user.name}`,
        isUrgent: leave.priority === 'urgent',
        email: leave.student.email,
      }),
    ]);

    res.status(200).json({ message: 'Request reviewed', leave });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getLeaveHistory,
  reviewLeaveRequest,
};