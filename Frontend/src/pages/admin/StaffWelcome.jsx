import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const links = {
  teacher: [
    ['/admin/qr', 'Generate attendance QR'],
    ['/admin/timetable', 'Timetable'],
    ['/admin/materials', 'Upload notes / assignment'],
    ['/admin/events', 'Events'],
  ],
  accounts: [['/admin/fee-queries', 'Fee queries']],
  organizer: [
    ['/organizer', 'My events'],
    ['/organizer/events/new', 'Post a new event'],
  ],
}

export default function StaffWelcome() {
  const { user } = useAuth()
  const items = links[user.role] || []

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm capitalize text-slate-500">
          {user.role.replace('_', ' ')}
          {user.designation ? ` · ${user.designation}` : ''}
          {user.branch ? ` · ${user.branch}` : ''}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="block rounded-xl border bg-white p-4 text-sm font-medium hover:bg-slate-50">
              {label} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}