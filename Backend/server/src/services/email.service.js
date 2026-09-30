const transactionalEmailApi = require('../config/brevo');

// sendEmail({ to: 'student@x.com', subject: '...', htmlContent: '<p>...</p>' })
const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    await transactionalEmailApi.sendTransacEmail({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
};

module.exports = { sendEmail };