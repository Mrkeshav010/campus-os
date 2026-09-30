const PushSubscription = require('../models/PushSubscription');

// GET /api/push/public-key
const getPublicKey = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: 'Push is not configured on the server' });
  }
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /api/push/subscribe   body = the browser's PushSubscription JSON
const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription' });
    }

    // One browser endpoint belongs to one user. If someone else logs in on
    // the same browser, the endpoint moves to them (upsert by endpoint).
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Subscribed' });
  } catch (error) {
    next(error);
  }
};

// POST /api/push/unsubscribe   body = { endpoint }
const unsubscribe = async (req, res, next) => {
  try {
    await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id });
    res.status(200).json({ message: 'Unsubscribed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe };
