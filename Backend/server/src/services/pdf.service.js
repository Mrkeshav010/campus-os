const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const COLLEGE_NAME = process.env.COLLEGE_NAME || 'Your College Name';
const COLLEGE_ADDRESS = process.env.COLLEGE_ADDRESS || '';

const TITLES = {
  bonafide: 'Bonafide Certificate',
  'no-dues': 'No-Dues Certificate',
  character: 'Character Certificate',
  migration: 'Migration Certificate',
};

const bodyText = ({ type, studentName, rollNumber, branch, year, reason }) => {
  const who = `${studentName} (Roll No. ${rollNumber || '-'})`;
  const course = `${branch || 'the institute'}${year ? `, Year ${year}` : ''}`;

  switch (type) {
    case 'no-dues':
      return `This is to certify that ${who}, ${course}, has no dues pending towards the institute, including the library, hostel and accounts section, as on the date of issue.`;
    case 'character':
      return `This is to certify that ${who}, ${course}, is a student of this institute and that the conduct of the student during the period of study has been good.`;
    case 'migration':
      return `This is to certify that ${who}, ${course}, is a student of this institute. The institute has no objection to the student migrating to another institution.`;
    default:
      return `This is to certify that ${who} is a bonafide student of this institute, studying in ${course}.${
        reason ? ` This certificate is issued for the purpose of: ${reason}.` : ''
      }`;
  }
};

// Writes the PDF to /uploads/certificates and resolves only after the file is fully saved.
// signaturePath: optional scanned signature PNG (transparent background)
// verifyBaseUrl: e.g. https://yourapp.com/verify  -> the QR encodes /verify/CERT-xxxx
const generateCertificatePDF = async ({
  type,
  studentName,
  rollNumber,
  branch,
  year,
  reason,
  certificateId,
  signaturePath,
  verifyBaseUrl,
}) => {
  const outputDir = path.join(__dirname, '../../uploads/certificates');
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${certificateId}.pdf`);

  const verifyUrl = `${verifyBaseUrl}/${certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Letterhead
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#000').text(COLLEGE_NAME, 50, 50, { width: 495, align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor('#555').text(COLLEGE_ADDRESS, 50, 78, { width: 495, align: 'center' });
  doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#999').stroke();

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#000')
    .text((TITLES[type] || 'Certificate').toUpperCase(), 50, 140, { width: 495, align: 'center', underline: true });

  // Reference line
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(`Certificate ID: ${certificateId}`, 50, 185, { width: 300 });
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 345, 185, {
    width: 200,
    align: 'right',
  });

  // Body
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#000')
    .text(bodyText({ type, studentName, rollNumber, branch, year, reason }), 50, 240, {
      width: 495,
      align: 'justify',
      lineGap: 8,
    });

  // Signature block (right)
  if (signaturePath && fs.existsSync(signaturePath)) {
    doc.image(signaturePath, 400, 560, { width: 120 });
  }
  doc.moveTo(390, 640).lineTo(540, 640).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(10).fillColor('#000').text('Authorized Signatory', 390, 646, { width: 150, align: 'center' });

  // Verification QR (left)
  doc.image(qrBuffer, 50, 560, { width: 90 });
  doc.fontSize(8).fillColor('#555').text('Scan to verify this certificate', 50, 654, { width: 200 });
  doc.text(verifyUrl, 50, 666, { width: 300 });

  doc
    .fontSize(8)
    .fillColor('#777')
    .text(
      'This is a computer-generated certificate. Its authenticity can be checked using the QR code or the link above.',
      50,
      760,
      { width: 495, align: 'center' }
    );

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/certificates/${certificateId}.pdf`;
};

module.exports = { generateCertificatePDF };