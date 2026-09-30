import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const hodLinks = [
  { to: '/admin/hod-attendance', title: 'Class attendance', desc: 'Daily, weekly, monthly report and student search' },
  { to: '/admin/notices', title: 'Notices', desc: 'Post for teachers and students of your department' },
  { to: '/admin/qr', title: 'Start attendance QR', desc: 'Take your own class' },
  { to: '/admin/requests', title: 'Leave requests', desc: 'Approve or reject for your department' },
]

const Card = ({ label, value, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-xl border p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50 ${
      active ? 'border-emerald-500 bg-emerald-50' : 'bg-white'
    }`}
  >
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 text-[11px] text-emerald-700">Click to view</div>
  </button>
)

const fmt = (d, type) =>
  type === 'gatepass'
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })

function StudentsList({ items }) {
  if (!items.length) return <div className="text-sm text-slate-500">No students yet.</div>
  return (
    <ul className="divide-y text-sm">
      {items.map((s) => (
        <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-slate-500">{s.email}</div>
          </div>
          <div className="text-xs text-slate-600">
            Roll: <span className="font-medium">{s.rollNumber || '—'}</span> · {s.branch} · Year {s.year} · Sec {s.section}
          </div>
        </li>
      ))}
    </ul>
  )
}

function TeachersList({ items }) {
  if (!items.length) return <div className="text-sm text-slate-500">No teachers yet.</div>
  return (
    <ul className="divide-y text-sm">
      {items.map((t) => (
        <li key={t._id} className="py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">
              {t.name} <span className="text-xs font-normal uppercase text-slate-400">{t.role}</span>
            </div>
            <div className="text-xs text-slate-500">
              {t.branch} · {t.email}
              {t.phone ? ` · ${t.phone}` : ''}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Teaches:{' '}
            {t.subjects.length ? (
              t.subjects.map((s) => (
                <span key={s} className="mr-1 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-slate-400">Not uploaded yet</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function LeaveList({ items }) {
  if (!items.length) return <div className="text-sm text-slate-500">No pending requests.</div>
  return (
    <ul className="divide-y text-sm">
      {items.map((l) => (
        <li key={l._id} className="py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">
              {l.student?.name}{' '}
              <span className="text-xs font-normal text-slate-500">
                Student · Roll {l.student?.rollNumber || '—'} · Year {l.student?.year} · Sec {l.student?.section}
              </span>
            </div>
            <div className="text-xs">
              <span className="font-medium capitalize">{l.type}</span>
              {l.priority === 'urgent' && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-700">Urgent</span>}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {fmt(l.fromDate, l.type)} → {fmt(l.toDate, l.type)}
          </div>
          <div className="text-slate-700">{l.reason}</div>
        </li>
      ))}
    </ul>
  )
}

export default function Overview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    api
      .get('/overview')
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load overview'))
  }, [])

  const open = async (type) => {
    if (tab === type) {
      setTab('')
      return
    }
    setTab(type)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await api.get('/overview/details', { params: { type } })
      setDetail(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the list')
    } finally {
      setDetailLoading(false)
    }
  }

  const isHod = user.role === 'hod'
  const max = data ? Math.max(1, ...data.departments.map((d) => d.pendingLeave)) : 1
  const titles = { students: 'Students', teachers: 'Teachers', leave: 'Pending leave requests' }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{isHod ? `${user.branch} department` : 'All departments'}</h1>
        <p className="text-sm text-slate-500">
          {isHod ? 'Only your department is shown.' : 'View-only summary across departments.'}
        </p>
      </div>

      {isHod && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hodLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-xl border border-blue-100 bg-white p-4 transition hover:border-blue-400 hover:shadow"
            >
              <div className="font-semibold text-blue-700">{l.title}</div>
              <div className="mt-1 text-sm text-slate-500">{l.desc}</div>
            </Link>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {!data && !error && <div className="text-sm text-slate-500">Loading...</div>}

      {data && (
        <>
          {data.pendingStaff > 0 && (
            <Link
              to="/admin/pending-staff"
              className="block rounded-lg bg-amber-50 p-3 text-sm text-amber-700 hover:bg-amber-100"
            >
              {data.pendingStaff} staff account(s) waiting for your approval →
            </Link>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card label="Students" value={data.totals.students} active={tab === 'students'} onClick={() => open('students')} />
            <Card label="Teachers / HODs" value={data.totals.teachers} active={tab === 'teachers'} onClick={() => open('teachers')} />
            <Card label="Pending leave requests" value={data.totals.pendingLeave} active={tab === 'leave'} onClick={() => open('leave')} />
          </div>

          {tab && (
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{titles[tab]}</h2>
                <button onClick={() => setTab('')} className="text-xs text-slate-500 hover:text-slate-800">
                  Close
                </button>
              </div>
              {detailLoading || !detail ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : tab === 'students' ? (
                <StudentsList items={detail.students || []} />
              ) : tab === 'teachers' ? (
                <TeachersList items={detail.teachers || []} />
              ) : (
                <LeaveList items={detail.leaves || []} />
              )}
            </div>
          )}

          {data.departments.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">
              No department data yet.
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border bg-white p-4">
              <h2 className="font-semibold">{isHod ? 'Department' : 'Department-wise comparison'}</h2>
              {data.departments.map((d) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-xs text-slate-500">
                      {d.students} students · {d.teachers} teachers · {d.pendingLeave} pending leave
                    </span>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${(d.pendingLeave / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}