import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/common/StatusBadge'

const barColor = (p) => (p < 75 ? 'bg-red-500' : p < 85 ? 'bg-amber-500' : 'bg-emerald-500')
const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' })

const quick = [
  ['/student/leave', 'Leave / Gate-pass'],
  ['/student/complaints', 'Complaints'],
  ['/student/certificates', 'Certificates'],
  ['/student/fee-queries', 'Fee Queries'],
  ['/student/mess', 'Mess Menu'],
  ['/student/lost-found', 'Lost & Found'],
  ['/student/assistant', 'AI Assistant'],
]

function Stat({ label, value, tone = 'text-slate-800', hint }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ subjects: [], leaves: [], notices: [], slots: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      api.get('/attendance/my-percentage'),
      api.get('/leave/my'),
      api.get('/notices'),
      api.get('/timetable/my'),
    ]).then(([att, leave, notice, tt]) => {
      if (!alive) return
      setData({
        subjects: att.value?.data.subjects || [],
        leaves: leave.value?.data.leaves || [],
        notices: notice.value?.data.notices || [],
        slots: tt.value?.data.slots || [],
      })
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const totals = data.subjects.reduce(
    (a, s) => ({ p: a.p + s.presentCount, t: a.t + s.totalClasses }),
    { p: 0, t: 0 }
  )
  const overall = totals.t ? Math.round((totals.p / totals.t) * 1000) / 10 : null
  const low = data.subjects.filter((s) => s.percentage < 75)
  const pending = data.leaves.filter((l) => l.status === 'pending').length
  const todaySlots = data.slots.filter((s) => s.day === todayName())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-indigo-600 p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.name}</h1>
          <p className="text-sm text-indigo-100">
            {user.branch} · Year {user.year} · Section {user.section}
          </p>
        </div>
        <Link
          to="/student/attendance"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Scan attendance QR
        </Link>
      </div>

      {low.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Low attendance in {low.map((s) => `${s.subject} (${s.percentage}%)`).join(', ')}. Below 75% can block your exams.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Overall attendance"
          value={overall === null ? '—' : `${overall}%`}
          tone={overall === null ? 'text-slate-800' : overall < 75 ? 'text-red-600' : 'text-emerald-600'}
          hint={totals.t ? `${totals.p} of ${totals.t} classes` : 'No classes yet'}
        />
        <Stat label="Low subjects" value={low.length} tone={low.length ? 'text-red-600' : 'text-slate-800'} hint="Below 75%" />
        <Stat label="Pending requests" value={pending} hint="Leave / gate-pass" />
        <Stat label="Classes today" value={todaySlots.length} hint={todayName()} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Today's classes</h2>
          {loading ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : todaySlots.length === 0 ? (
            <div className="text-sm text-slate-400">No classes scheduled today.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {todaySlots.map((s) => (
                <li key={s._id} className="flex justify-between rounded bg-slate-50 px-3 py-2">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-slate-500">
                    {s.startTime}–{s.endTime}
                    {s.room ? ` · ${s.room}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Attendance by subject</h2>
          {data.subjects.length === 0 ? (
            <div className="text-sm text-slate-400">No attendance recorded yet.</div>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.subjects.map((s) => (
                <li key={s.subject}>
                  <div className="flex justify-between">
                    <span>{s.subject}</span>
                    <span className="font-medium">{s.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${barColor(s.percentage)}`} style={{ width: `${Math.min(100, s.percentage)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent leave / gate-pass</h2>
            <Link to="/student/leave" className="text-xs text-indigo-600">View all</Link>
          </div>
          {data.leaves.length === 0 ? (
            <div className="text-sm text-slate-400">No requests yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.leaves.slice(0, 4).map((l) => (
                <li key={l._id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                  <span className="capitalize">{l.type}</span>
                  <StatusBadge value={l.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest notices</h2>
            <Link to="/student/notices" className="text-xs text-indigo-600">View all</Link>
          </div>
          {data.notices.length === 0 ? (
            <div className="text-sm text-slate-400">No notices for you.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.notices.slice(0, 4).map((n) => (
                <li key={n._id} className="rounded bg-slate-50 px-3 py-2">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        {quick.map(([to, label]) => (
          <Link key={to} to={to} className="rounded-full border bg-white px-4 py-1.5 text-sm hover:bg-slate-100">
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}