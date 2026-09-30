import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/common/StatusBadge'
import NaacAuditor from '../../components/admin/NaacAuditor'

const actions = [
  { to: '/admin/hod-attendance', title: 'Class attendance', desc: "Today's classes, present and absent students", roles: ['hod', 'admin'] },
  { to: '/admin/qr', title: 'Start attendance QR', desc: 'Generate a class QR that expires on its own', roles: ['admin', 'faculty'] },
  { to: '/admin/requests', title: 'Review leave requests', desc: 'Approve or reject in real time', roles: ['admin', 'warden'] },
  { to: '/admin/complaints', title: 'Complaint tracker', desc: 'AI-prioritised, with recurring flags', roles: ['admin', 'warden'] },
  { to: '/admin/certificates', title: 'Certificate queue', desc: 'Approve and issue verifiable PDFs', roles: ['admin'] },
  { to: '/admin/notices', title: 'Post a notice', desc: 'Target a year, branch or hostel', roles: ['admin'] },
  { to: '/admin/fee-queries', title: 'Fee queries', desc: 'Reply to student tickets', roles: ['admin'] },
  { to: '/admin/timetable', title: 'Timetable', desc: 'Manage slots with clash detection', roles: ['admin', 'faculty'] },
  { to: '/admin/mess', title: 'Mess menu', desc: 'Update breakfast, lunch and dinner for each day', roles: ['warden'] },
]

function Stat({ label, value, to, tone = 'text-slate-800' }) {
  return (
    <Link to={to} className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm transition hover:shadow">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${tone}`}>{value ?? '—'}</div>
    </Link>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [d, setD] = useState({ leaves: null, analytics: null, certs: null, fees: null })

  useEffect(() => {
    if (['faculty', 'teacher', 'hod'].includes(user.role)) return
    let alive = true
    Promise.allSettled([
      api.get('/leave/pending'),
      api.get('/complaints/analytics'),
      api.get('/certificates/pending'),
      api.get('/fee-queries'),
    ]).then(([leave, an, cert, fee]) => {
      if (!alive) return
      setD({
        leaves: leave.value?.data.leaves ?? null,
        analytics: an.value?.data ?? null,
        certs: cert.value?.data.certs ?? null,
        fees: fee.value?.data.queries ?? null,
      })
    })
    return () => {
      alive = false
    }
  }, [user.role])

  const pendingLeaves = d.leaves || []
  const urgent = pendingLeaves.filter((l) => l.priority === 'urgent').length
  const heat = d.analytics?.heatmap || []
  const maxHeat = heat[0]?.count || 1

  const stats = [
    { label: 'Pending leave / gate-pass', value: d.leaves ? pendingLeaves.length : null, to: '/admin/requests', roles: ['admin', 'warden'] },
    { label: 'Urgent requests', value: d.leaves ? urgent : null, to: '/admin/requests', roles: ['admin', 'warden'], tone: urgent ? 'text-red-600' : 'text-slate-800' },
    { label: 'Open complaints', value: d.analytics?.pendingCount ?? null, to: '/admin/complaints', roles: ['admin', 'warden'] },
    { label: 'Avg resolution (hrs)', value: d.analytics ? d.analytics.avgResolutionHours : null, to: '/admin/complaints', roles: ['admin', 'warden'] },
    { label: 'Pending certificates', value: d.certs ? d.certs.length : null, to: '/admin/certificates', roles: ['admin'] },
    { label: 'Open fee queries', value: d.fees ? d.fees.filter((q) => q.status === 'open').length : null, to: '/admin/fee-queries', roles: ['admin'] },
  ].filter((s) => s.roles.includes(user.role))

  const myActions = actions.filter((a) => a.roles.includes(user.role))
  const showLeavePanel = ['admin', 'warden'].includes(user.role)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white shadow-sm">
        <div className="text-xs uppercase tracking-widest text-blue-100">Admin console</div>
        <h1 className="mt-1 text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm capitalize text-blue-100">
          {user.role} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {user.role === 'admin' && <NaacAuditor />}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}

      {showLeavePanel && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-blue-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Needs your decision</h2>
              <Link to="/admin/requests" className="text-xs text-blue-600">Open queue</Link>
            </div>
            {pendingLeaves.length === 0 ? (
              <div className="text-sm text-slate-400">No pending requests.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {pendingLeaves.slice(0, 5).map((l) => (
                  <li key={l._id} className="flex items-center justify-between rounded bg-sky-50 px-3 py-2">
                    <div>
                      <div className="font-medium">{l.student?.name}</div>
                      <div className="text-xs capitalize text-slate-500">
                        {l.type} · {new Date(l.fromDate).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge value={l.priority} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-4">
            <h2 className="mb-3 font-semibold">Complaint hotspots</h2>
            {heat.length === 0 ? (
              <div className="text-sm text-slate-400">No complaints yet.</div>
            ) : (
              <ul className="space-y-3 text-sm">
                {heat.slice(0, 5).map((h) => (
                  <li key={h._id}>
                    <div className="flex justify-between">
                      <span>{h._id}</span>
                      <span className="font-medium">{h.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-blue-50">
                      <div className="h-full bg-blue-500" style={{ width: `${(h.count / maxHeat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myActions.map((a) => (
          <Link key={a.to} to={a.to} className="rounded-xl border border-blue-100 bg-white p-4 transition hover:border-blue-400 hover:shadow">
            <div className="font-semibold text-blue-700">{a.title}</div>
            <div className="mt-1 text-sm text-slate-500">{a.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}