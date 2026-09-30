const webpush = require('web-push');

// Run `npx web-push generate-vapid-keys` once and paste the output into .env
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@campusconnect.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;