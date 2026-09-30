const FeeQuery = require('../models/FeeQuery');
const User = require('../models/User');
const { notify } = require('../services/notification.service');

// POST /api/fee-queries   (student only) - opens a new query thread
const createFeeQuery = async (req, res, next) => {
  try {
    const { subject, message } = req.body;

    const query = await FeeQuery.create({
      student: req.user.id,
      subject,
      messages: [{ sender: req.user.id, senderRole: 'student', text: message }],
    });

    const admins = await User.find({ role: 'admin' });
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin._id,
          event: 'newFeeQuery',
          data: { queryId: query._id, subject },
          title: 'New fee query',
          body: `${req.user.name}: ${subject}`,
          isUrgent: false,
          email: admin.email,
        })
      )
    );

    res.status(201).json({ message: 'Query submitted', query });
  } catch (error) {
    next(error);
  }
};

// GET /api/fee-queries/my   (student only)
const getMyFeeQueries = async (req, res, next) => {
  try {
    const queries = await FeeQuery.find({ student: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json({ queries });
  } catch (error) {
    next(error);
  }
};

// GET /api/fee-queries   (admin only)
const getAllFeeQueries = async (req, res, next) => {
  try {
    const queries = await FeeQuery.find()
      .populate('student', 'name rollNumber')
      .sort({ status: 1, updatedAt: -1 }); // open first
    res.status(200).json({ queries });
  } catch (error) {
    next(error);
  }
};

// POST /api/fee-queries/:id/reply   (student or admin - whoever it belongs to / handles it)
const replyToFeeQuery = async (req, res, next) => {
  try {
    const { message } = req.body;
    const query = await FeeQuery.findById(req.params.id).populate('student', 'name email');
    if (!query) return res.status(404).json({ message: 'Query not found' });

    // A student can only reply to their own thread; admin can reply to any
    if (req.user.role === 'student' && String(query.student._id) !== req.user.id) {
      return res.status(403).json({ message: 'Not your query' });
    }

    query.messages.push({
      sender: req.user.id,
      senderRole: req.user.role === 'student' ? 'student' : 'admin',
      text: message,
    });
    await query.save();

    // Notify the other party
    if (req.user.role === 'student') {
      const admins = await User.find({ role: 'admin' });
      await Promise.all(
        admins.map((admin) =>
          notify({
            userId: admin._id,
            event: 'feeQueryReply',
            data: { queryId: query._id },
            title: 'New reply on fee query',
            body: `${req.user.name} replied: ${message}`,
            isUrgent: false,
            email: admin.email,
          })
        )
      );
    } else {
      await notify({
        userId: query.student._id,
        event: 'feeQueryReply',
        data: { queryId: query._id },
        title: 'Reply to your fee query',
        body: message,
        isUrgent: false,
        email: query.student.email,
      });
    }

    res.status(200).json({ message: 'Reply added', query });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/fee-queries/:id/resolve   (admin only)
const resolveFeeQuery = async (req, res, next) => {
  try {
    const query = await FeeQuery.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.status(200).json({ message: 'Query resolved', query });
  } catch (error) {
    next(error);
  }
};

module.exports = { createFeeQuery, getMyFeeQueries, getAllFeeQueries, replyToFeeQuery, resolveFeeQuery };