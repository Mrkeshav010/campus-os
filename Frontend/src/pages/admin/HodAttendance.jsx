import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const pad = (n) => String(n).padStart(2, '0')
const ist = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

function presets() {
  const today = ist()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sunday
  const back = (dow + 6) % 7 // days since Monday
  const monday = new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10)
  return { today: [today, today], week: [monday, today], month: [`${y}-${pad(m)}-01`, today] }
}

const fmtDay = (s) =>
  new Date(`${s}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
const fmtTime = (t) =>
  new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

function Stat({ label, value, tone = 'text-slate-800' }) {
  return (
    <div className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  )
}

function PeopleList({ title, rows, tone }) {
  return (
    <div>
      <div className={`mb-1 text-sm font-semibold ${tone}`}>
        {title} ({rows.length})
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400">None</div>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-auto text-xs">
          {rows.map((r) => (
            <li key={r.userId} className="rounded bg-white px-2 py-1">
              <span className="font-medium">{r.name}</span>
              <span className="text-slate-500"> · Roll {r.rollNumber || '—'}</span>
              <div className="break-all font-mono text-[10px] text-slate-400">User ID: {r.userId}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ClassReport({ branch, blocked }) {
  const [mode, setMode] = useState('today')
  const [range, setRange] = useState(presets().today)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    if (blocked) return
    let alive = true
    setData(null)
    setError('')
    setOpen(null)
    api
      .get('/attendance/hod/report', {
        params: { from: range[0], to: range[1], ...(branch ? { branch } : {}) },
      })
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e.response?.data?.message || 'Could not load report'))
    return () => {
      alive = false
    }
  }, [range, branch, blocked])

  const pick = (m) => {
    setMode(m)
    if (m !== 'custom') setRange(presets()[m])
  }
  const single = range[0] === range[1]

  const modes = [
    ['today', 'Today'],
    ['week', 'This week'],
    ['month', 'This month'],
    ['custom', 'Custom'],
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {modes.map(([k, label]) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              mode === k ? 'bg-blue-600 text-white' : 'border bg-white text-slate-600 hover:bg-blue-50'
            }`}
          >
            {label}
          </button>
        ))}
        {mode === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={range[0]}
              onChange={(e) => setRange([e.target.value, range[1]])}
              className="rounded-lg border px-2 py-1"
            />
            <span>to</span>
            <input
              type="date"
              value={range[1]}
              onChange={(e) => setRange([range[0], e.target.value])}
              className="rounded-lg border px-2 py-1"
            />
          </div>
        )}
      </div>

      {blocked && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Type a department above first.</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {!blocked && !data && !error && <div className="text-sm text-slate-400">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Days with classes" value={data.totals.days} />
            <Stat label="Classes held" value={data.totals.classes} />
            <Stat label="Total present" value={data.totals.present} tone="text-green-600" />
            <Stat label="Total absent" value={data.totals.absent} tone="text-red-600" />
            <Stat label="Attendance %" value={`${data.totals.percentage}%`} />
          </div>

          {data.days.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-sm text-slate-400">No classes held in this period.</div>
          )}

          {data.days.map((day) => (
            <section key={day.date} className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-800">{fmtDay(day.date)}</div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">{day.classes.length} class(es)</span>
                  <span className="font-semibold text-green-600">P {day.present}</span>
                  <span className="font-semibold text-red-600">A {day.absent}</span>
                  {!single && (
                    <button
                      onClick={() => {
                        setMode('custom')
                        setRange([day.date, day.date])
                      }}
                      className="text-xs text-blue-600 underline"
                    >
                      View students
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {day.classes.map((c, i) => {
                  const k = `${day.date}-${i}`
                  return (
                    <div key={k} className="rounded-lg bg-slate-50 p-3">
                      <button
                        disabled={!single}
                        onClick={() => setOpen(open === k ? null : k)}
                        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                      >
                        <div>
                          <div className="font-medium text-blue-700">{c.subject}</div>
                          <div className="text-xs text-slate-500">
                            Year {c.year} · Sec {c.section} · {fmtTime(c.time)}
                          </div>
                          <div className="mt-1 text-xs">
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Class taken</span>{' '}
                            <span className="text-slate-600">by {c.teacher || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-slate-500">Total {c.totalStudents}</span>{' '}
                          <span className="font-semibold text-green-600">P {c.presentCount}</span>{' '}
                          <span className="font-semibold text-red-600">A {c.absentCount}</span>
                        </div>
                      </button>
                      {single && open === k && (
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <PeopleList title="Present" rows={c.present || []} tone="text-green-600" />
                          <PeopleList title="Absent" rows={c.absent || []} tone="text-red-600" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

function StudentSearch({ branch, blocked }) {
  const [roll, setRoll] = useState('')
  const [res, setRes] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState('all')

  const search = async (e) => {
    e.preventDefault()
    if (!roll.trim() || blocked) return
    setLoading(true)
    setError('')
    setRes(null)
    setMonth('all')
    try {
      const r = await api.get('/attendance/hod/student', {
        params: { roll: roll.trim(), ...(branch ? { branch } : {}) },
      })
      setRes(r.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const months = useMemo(() => (res ? [...new Set(res.history.map((h) => h.date.slice(0, 7)))] : []), [res])
  const rows = res ? (month === 'all' ? res.history : res.history.filter((h) => h.date.startsWith(month))) : []
  const pCount = rows.filter((h) => h.status === 'present').length
  const pPct = rows.length ? Math.round((pCount / rows.length) * 1000) / 10 : 0

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          placeholder="Enter student roll number"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          disabled={loading || blocked}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {blocked && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Type a department above first.</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {res && (
        <>
          <div className="rounded-xl border border-blue-100 bg-white p-4">
            <div className="text-lg font-semibold">{res.student.name}</div>
            <div className="text-sm text-slate-500">
              Roll {res.student.rollNumber} · {res.student.branch} · Year {res.student.year} · Sec{' '}
              {res.student.section}
            </div>
            <div className="mt-1 break-all font-mono text-[11px] text-slate-400">User ID: {res.student.userId}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total classes" value={res.overall.total} />
            <Stat label="Present" value={res.overall.present} tone="text-green-600" />
            <Stat label="Absent" value={res.overall.absent} tone="text-red-600" />
            <Stat
              label="Overall %"
              value={`${res.overall.percentage}%`}
              tone={res.overall.percentage < 75 ? 'text-red-600' : 'text-green-600'}
            />
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-4">
            <h3 className="mb-3 font-semibold">Subject-wise</h3>
            {res.subjects.length === 0 && <div className="text-sm text-slate-400">No classes held yet.</div>}
            <ul className="space-y-3 text-sm">
              {res.subjects.map((s) => (
                <li key={s.subject}>
                  <div className="flex justify-between">
                    <span className="font-medium">{s.subject}</span>
                    <span className="text-slate-500">
                      {s.present}/{s.total} · {s.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${s.percentage < 75 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Date-wise history</h3>
              <div className="flex items-center gap-3 text-sm">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-lg border px-2 py-1"
                >
                  <option value="all">All time</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">
                  {pCount}/{rows.length} present ({pPct}%)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Subject</th>
                    <th className="py-1 pr-3">Teacher</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((h, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3">{fmtDay(h.date)}</td>
                      <td className="py-1.5 pr-3">{h.subject}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{h.teacher || 'Manual entry'}</td>
                      <td className="py-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            h.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {h.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-slate-400">
                        No classes in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function HodAttendance() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [tab, setTab] = useState('report')
  const [branch, setBranch] = useState('')
  const blocked = isAdmin && !branch.trim()
  const dept = isAdmin ? branch.trim() : user.branch

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-sky-500 p-5 text-white">
        <div className="text-xs uppercase tracking-widest text-blue-100">
          {isAdmin ? 'Admin' : 'HOD'} · {dept || 'Department'}
        </div>
        <h1 className="text-xl font-bold">Class attendance</h1>
        <p className="text-sm text-blue-100">Only {dept || 'the selected'} department data is shown.</p>
      </div>

      {isAdmin && (
        <input
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="Department (e.g. MCA)"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      )}

      <div className="flex gap-2 border-b">
        {[
          ['report', 'Class report'],
          ['student', 'Student search'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'report' ? (
        <ClassReport branch={isAdmin ? branch.trim() : ''} blocked={blocked} />
      ) : (
        <StudentSearch branch={isAdmin ? branch.trim() : ''} blocked={blocked} />
      )}
    </div>
  )
}