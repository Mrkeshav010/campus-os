require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const aiRoutes = require('./routes/aiRoutes');
const feeQueryRoutes = require('./routes/feeQueryRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const messRoutes = require('./routes/messRoutes');
const lostFoundRoutes = require('./routes/lostFoundRoutes');
const pushRoutes = require('./routes/pushRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const overviewRoutes = require('./routes/overviewRoutes');
const materialRoutes = require('./routes/materialRoutes');
const examRoutes = require('./routes/examRoutes');
const eventRoutes = require('./routes/eventRoutes'); // NEW
const { startExamSweeper } = require('./controllers/examController');

const app = express();

// --- Core middleware ---
// Trailing slash in CLIENT_URL is removed so CORS matches the browser origin exactly
const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
app.use(cors({ origin: clientUrl || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static file serving (so generated certificate PDFs are downloadable) ---
app.use('/uploads', express.static('uploads'));

// --- Health check ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/fee-queries', feeQueryRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/events', eventRoutes); // NEW

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- HTTP server + Socket.io ---
const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startExamSweeper(); // auto-submits exams whose time is over
  });
});