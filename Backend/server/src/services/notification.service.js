const { getIO } = require('../config/socket');
const { sendPushToUser } = require('./push.service');
const { sendEmail } = require('./email.service');

/**
 * notify() is the single place every controller calls when something
 * needs to reach a user. It always fires Socket.io (in case they're
 * online right now) and Web Push (in case the tab is closed), and
 * ONLY sends an email when isUrgent is true — email is the slow/
 * guaranteed fallback, not the default channel.
 */
const notify = async ({ userId, event, data, title, body, isUrgent = false, email }) => {
  // 1. Real-time (works only if the user's socket is currently connected)
  try {
    getIO().to(String(userId)).emit(event, data);
  } catch (err) {
    console.warn('Socket emit skipped:', err.message);
  }

  // 2. Web push (works even if the tab/app is closed, once subscribed)
  await sendPushToUser(userId, { title, body, url: data?.url || '/' });

  // 3. Email fallback, urgent cases only
  if (isUrgent && email) {
    await sendEmail({
      to: email,
      subject: title,
      htmlContent: `<p>${body}</p>`,
    });
  }
};

module.exports = { notify };