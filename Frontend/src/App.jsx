import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import Verify from './pages/Verify'
import Assistant from './pages/student/Assistant'
import StudentDashboard from './pages/student/Dashboard'
import StudentAttendance from './pages/student/Attendance'
import StudentTimetable from './pages/student/Timetable'
import LeaveGatepass from './pages/student/LeaveGatepass'
import Complaints from './pages/student/Complaints'
import Certificates from './pages/student/Certificates'
import Notices from './pages/student/Notices'
import Materials from './pages/student/Materials'
import FeeQueries from './pages/student/FeeQueries'
import StudentMess from './pages/student/Mess'
import StudentExams from './pages/student/Exams'
import TakeExam from './pages/student/TakeExam'
import StudentResults from './pages/student/Results'
import AdminDashboard from './pages/admin/Dashboard'
import GenerateQR from './pages/admin/GenerateQR'
import Timetable from './pages/admin/Timetable'
import ApproveRequests from './pages/admin/ApproveRequests'
import ComplaintTracker from './pages/admin/ComplaintTracker'
import CertificateQueue from './pages/admin/CertificateQueue'
import NoticeManager from './pages/admin/NoticeManager'
import FacultyNotices from './pages/admin/FacultyNotices'
import HodNotices from './pages/admin/HodNotices'
import UploadMaterial from './pages/admin/UploadMaterial'
import FeeManager from './pages/admin/FeeManager'
import MessManager from './pages/admin/MessManager'
import PendingStaff from './pages/admin/PendingStaff'
import DepartmentManager from './pages/admin/DepartmentManager'
import Overview from './pages/admin/Overview'
import StaffWelcome from './pages/admin/StaffWelcome'
import HodAttendance from './pages/admin/HodAttendance'
import ExamManager from './pages/admin/ExamManager'
import ExamSubmissions from './pages/admin/ExamSubmissions'
import ExamReview from './pages/admin/ExamReview'

// Shown for any module page that hasn't been built yet
const ComingSoon = () => (
  <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
    This module is being built.
  </div>
)

// Wraps an admin-side page with the roles the backend allows for it
const Staff = ({ roles, children }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>

const ALL_STAFF = ['admin', 'warden', 'faculty', 'teacher', 'hod', 'principal', 'vice_principal', 'accounts']
const CAN_QR = ['admin', 'faculty', 'teacher', 'hod']
const NOTICE_ROLES = ['admin', 'teacher', 'hod', 'faculty']
const UPLOAD_ROLES = ['admin', 'teacher', 'hod', 'faculty']
const EXAM_ROLES = ['admin', 'teacher', 'hod', 'faculty']

// The first screen after login depends on the role
function StaffHome() {
  const { user } = useAuth()
  if (['principal', 'vice_principal', 'hod'].includes(user.role)) return <Overview />
  if (['teacher', 'accounts'].includes(user.role)) return <StaffWelcome />
  return <AdminDashboard />
}

// Admin posts/deletes all notices, HOD posts for own department, others only read
function NoticesPage() {
  const { user } = useAuth()
  if (user.role === 'admin') return <NoticeManager />
  if (user.role === 'hod') return <HodNotices />
  return <FacultyNotices />
}

export default function App() {
  const { user } = useAuth()
  const home = !user ? '/login' : user.role === 'student' ? '/student' : '/admin'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to={home} replace /> : <ForgotPassword />} />

      {/* Public: opened by scanning the QR on a certificate */}
      <Route path="/verify/:certificateId" element={<Verify />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="leave" element={<LeaveGatepass />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="notices" element={<Notices />} />
        <Route path="materials" element={<Materials />} />
        <Route path="fee-queries" element={<FeeQueries />} />
        <Route path="mess" element={<StudentMess />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="exams/:id/take" element={<TakeExam />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={ALL_STAFF}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffHome />} />
        <Route path="overview" element={<Staff roles={['admin']}><Overview /></Staff>} />
        <Route path="pending-staff" element={<Staff roles={['admin']}><PendingStaff /></Staff>} />
        <Route path="departments" element={<Staff roles={['admin']}><DepartmentManager /></Staff>} />
        <Route path="qr" element={<Staff roles={CAN_QR}><GenerateQR /></Staff>} />
        <Route path="hod-attendance" element={<Staff roles={['hod', 'admin']}><HodAttendance /></Staff>} />
        <Route path="timetable" element={<Staff roles={CAN_QR}><Timetable /></Staff>} />
        <Route path="requests" element={<Staff roles={['admin', 'warden', 'hod']}><ApproveRequests /></Staff>} />
        <Route path="complaints" element={<Staff roles={['admin', 'warden']}><ComplaintTracker /></Staff>} />
        <Route path="certificates" element={<Staff roles={['admin']}><CertificateQueue /></Staff>} />
        <Route path="notices" element={<Staff roles={NOTICE_ROLES}><NoticesPage /></Staff>} />
        <Route path="materials" element={<Staff roles={UPLOAD_ROLES}><UploadMaterial /></Staff>} />
        <Route path="exams" element={<Staff roles={EXAM_ROLES}><ExamManager /></Staff>} />
        <Route path="exams/attempt/:attemptId" element={<Staff roles={EXAM_ROLES}><ExamReview /></Staff>} />
        <Route path="exams/:id" element={<Staff roles={EXAM_ROLES}><ExamSubmissions /></Staff>} />
        <Route path="fee-queries" element={<Staff roles={['admin', 'accounts']}><FeeManager /></Staff>} />
        <Route path="mess" element={<Staff roles={['warden']}><MessManager /></Staff>} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}