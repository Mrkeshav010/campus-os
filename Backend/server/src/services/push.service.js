const webpush = require('../config/webpush');
const PushSubscription = require('../models/PushSubscription');

// sendPushToUser(userId, { title: '...', body: '...', url: '/leave' })
const sendPushToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ user: userId });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      )
    )
  );

  // Clean up subscriptions that are no longer valid (user revoked permission, etc.)
  results.forEach((result, i) => {
    if (result.status === 'rejected' && result.reason?.statusCode === 410) {
      PushSubscription.findByIdAndDelete(subscriptions[i]._id).catch(() => {});
    }
  });

  return results;
};

module.exports = { sendPushToUser };