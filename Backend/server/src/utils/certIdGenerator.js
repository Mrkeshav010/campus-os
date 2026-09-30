// Generates a unique, human-readable certificate ID like CERT-2026-00234
// Used for the verification QR / public lookup page.
const Certificate = require('../models/Certificate');

const generateCertificateId = async () => {
  const year = new Date().getFullYear();
  const countThisYear = await Certificate.countDocuments({
    certificateId: { $regex: `^CERT-${year}-` },
  });
  const serial = String(countThisYear + 1).padStart(5, '0');
  return `CERT-${year}-${serial}`;
};

module.exports = { generateCertificateId };