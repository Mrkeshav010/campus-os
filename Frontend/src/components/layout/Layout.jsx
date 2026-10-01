import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import usePushNotification from '../../hooks/usePushNotification'

const studentNav = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/attendance', label: 'Attendance' },
  { to: '/student/timetable', label: 'Timetable' },
  { to: '/student/leave', label: 'Leave / Gate-pass' },
  { to: '/student/complaints', label: 'Complaints' },
  { to: '/student/certificates', label: 'Certificates' },
  { to: '/student/notices', label: 'Notices' },
  { to: '/student/events', label: 'Events' }, // NEW
  { to: '/student/materials', label: 'Class Updates' },
  { to: '/student/exams', label: 'Exams' },
  { to: '/student/results', label: 'Results' },
  { to: '/student/fee-queries', label: 'Fee Queries' },
  { to: '/student/mess', label: 'Mess Menu' },
  { to: '/student/lost-found', label: 'Lost & Found' },
  { to: '/student/assistant', label: 'AI Assistant' },
]

// NEW: organizer ka menu
const organizerNav = [
  { to: '/organizer', label: 'My Events', end: true },
  { to: '/organizer/events/new', label: 'Post Event' },
]

const ALL_STAFF = ['admin', 'warden', 'faculty', 'teacher', 'hod', 'principal', 'vice_principal', 'accounts']
const CAN_QR = ['admin', 'faculty', 'teacher', 'hod']

// Each staff role only sees the pages its backend routes allow
const staffNav = [
  { to: '/admin', label: 'Dashboard', end: true, roles: ALL_STAFF },
  { to: '/admin/overview', label: 'Department Overview', roles: ['admin'] },
  { to: '/admin/pending-staff', label: 'Pending Staff', roles: ['admin'] },
  { to: '/admin/departments', label: 'Departments', roles: ['admin'] },
  { to: '/admin/qr', label: 'Attendance QR', roles: CAN_QR },
  { to: '/admin/hod-attendance', label: 'Class Attendance', roles: ['admin', 'hod'] },
  { to: '/admin/timetable', label: 'Timetable', roles: CAN_QR },
  { to: '/admin/requests', label: 'Leave Requests', roles: ['admin', 'warden', 'hod'] },
  { to: '/admin/complaints', label: 'Complaints', roles: ['admin', 'warden'] },
  { to: '/admin/certificates', label: 'Certificates', roles: ['admin'] },
  { to: '/admin/notices', label: 'Notices', roles: ['admin', 'teacher', 'hod', 'faculty'] },
  { to: '/admin/events', label: 'Events', roles: ['admin', 'teacher', 'hod', 'faculty'] }, // NEW
  { to: '/organizer', label: 'Organizer Panel', roles: ['admin'] }, // NEW
  { to: '/admin/materials', label: 'Study Material', roles: ['admin', 'teacher', 'hod', 'faculty'] },
  { to: '/admin/exams', label: 'Class Tests', roles: ['admin', 'teacher', 'hod', 'faculty'] },
  { to: '/admin/fee-queries', label: 'Fee Queries', roles: ['admin', 'accounts'] },
  { to: '/admin/mess', label: 'Mess Menu', roles: ['warden'] },
]

const themes = {
  student: {
    side: 'bg-blue-900',
    active: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    title: 'Student Portal',
  },
  staff: {
    side: 'bg-sky-900',
    active: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    title: 'Admin Console',
  },
  // NEW
  organizer: {
    side: 'bg-indigo-900',
    active: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
    title: 'Organizer Panel',
  },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const push = usePushNotification()
  const [open, setOpen] = useState(false)

  const isStudent = user.role === 'student'
  const isOrganizer = user.role === 'organizer' // NEW
  const theme = isStudent ? themes.student : isOrganizer ? themes.organizer : themes.staff
  const items = isStudent
    ? studentNav
    : isOrganizer
      ? organizerNav
      : staffNav.filter((i) => i.roles.includes(user.role))

  const handleLogout = async () => {
    await push.detach()
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-sky-50 md:flex">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto p-4 text-slate-200 transition-transform md:static md:translate-x-0 ${theme.side} ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6">
          <div className="text-xl font-bold text-white">Campus Connect</div>
          <div className="text-xs uppercase tracking-wider text-blue-200">{theme.title}</div>
        </div>
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive ? `${theme.active} text-white` : 'hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2 border-b border-sky-100 bg-white px-4 py-3">
          <button className="text-2xl md:hidden" onClick={() => setOpen(true)}>
            ☰
          </button>
          <span className={`hidden rounded-full px-3 py-1 text-xs font-medium capitalize md:inline-block ${theme.badge}`}>
            {user.role.replace('_', ' ')}
            {isOrganizer && user.designation ? ` · ${user.designation}` : ''}
            {!isStudent && !isOrganizer && user.branch ? ` · ${user.branch}` : ''}
          </span>

          <div className="flex items-center gap-2">
            {push.supported && push.permission !== 'denied' && (
              <button
                onClick={push.subscribed ? push.disable : push.enable}
                disabled={push.busy}
                title={push.error || ''}
                className={`rounded-lg border px-3 py-1 text-xs disabled:opacity-60 ${
                  push.subscribed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'hover:bg-slate-100'
                }`}
              >
                {push.subscribed ? 'Alerts on' : 'Enable alerts'}
              </button>
            )}
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            <button onClick={handleLogout} className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-100">
              Logout
            </button>
          </div>
        </header>

        {push.error && <div className="bg-red-50 px-4 py-2 text-xs text-red-600">{push.error}</div>}

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}