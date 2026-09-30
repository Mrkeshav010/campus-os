const Complaint = require('../models/Complaint');

// Flags a complaint as recurring if the same location had 3+ complaints
// in the last 30 days. Called right after a new complaint is created.
const checkRecurringIssue = async (location) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const count = await Complaint.countDocuments({
    location,
    createdAt: { $gte: thirtyDaysAgo },
  });

  if (count >= 3) {
    await Complaint.updateMany({ location, createdAt: { $gte: thirtyDaysAgo } }, { isRecurring: true });
    return true;
  }
  return false;
};

// Average resolution time (in hours) for admin analytics dashboard
const getAverageResolutionTime = async () => {
  const result = await Complaint.aggregate([
    { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
    {
      $project: {
        resolutionHours: {
          $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60],
        },
      },
    },
    { $group: { _id: null, avgHours: { $avg: '$resolutionHours' } } },
  ]);
  return result[0]?.avgHours?.toFixed(1) || 0;
};

// Recurring-issue heatmap data: location -> complaint count
const getRecurringIssueHeatmap = async () => {
  return Complaint.aggregate([
    { $group: { _id: '$location', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
};

module.exports = { checkRecurringIssue, getAverageResolutionTime, getRecurringIssueHeatmap };