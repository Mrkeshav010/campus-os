const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generates a random, hard-to-guess session code (encoded inside the QR)
const generateSessionCode = () => uuidv4();

// Converts the session code into a QR image (base64 data URL) that the
// frontend can render directly in an <img src="..."> without needing
// a separate file upload/storage step.
const generateQRImage = async (sessionCode) => {
  const qrDataUrl = await QRCode.toDataURL(sessionCode);
  return qrDataUrl;
};

module.exports = { generateSessionCode, generateQRImage };