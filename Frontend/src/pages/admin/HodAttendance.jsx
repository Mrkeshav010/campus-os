import { useEffect, useState } from 'react'
import api from '../../services/api'

function IdList({ title, rows, tone }) {
  return (
    <div>
      <div className={`mb-1 text-sm font-semibold ${tone}`}>{title} ({rows.length})</div>
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400">None</div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-auto text-xs">
          {rows.map((r) => (
            <li key={r.userId} className="rounded bg-slate-50 px-2 py-1">
              <span className="font-medium">{r.name}</span>
              {r.rollNumber && <span className="text-slate-500"> · {r.rollNumber}</span>}
              <div className="break-all font-mono text-[10px] text-slate-400">ID: {r.userId}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function HodAttendance() {
  const [date, setDate] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    setData(null)
    setError('')
    api
      .get('/attendance/hod/today', { params: date ? { date } : {} })
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not load attendance'))
  }, [date])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-700 to-sky-500 p-5 text-white">
        <div>
          <div className="text-xs uppercase tracking-widest text-blue-100">HOD · {data?.department || ''}</div>
          <h1 className="text-xl font-bold">Class attendance — {data?.date || 'today'}</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-800"
        />
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {!data && !error && <div className="text-sm text-slate-400">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Classes held', data.totals.classes, 'text-slate-800'],
              ['Total present', data.totals.present, 'text-green-600'],
              ['Total absent', data.totals.absent, 'text-red-600'],
            ].map(([label, val, tone]) => (
              <div key={label} className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-400">{label}</div>
                <div className={`text-3xl font-bold ${tone}`}>{val}</div>
              </div>
            ))}
          </div>

          {data.classes.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-sm text-slate-400">No classes held on this date.</div>
          )}

          {data.classes.map((c, i) => (
            <section key={i} className="rounded-xl border border-blue-100 bg-white p-4">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between text-left">
                <div>
                  <div className="font-semibold text-blue-700">{c.subject}</div>
                  <div className="text-xs text-slate-500">
                    Year {c.year} · Section {c.section} · {c.teacher} ·{' '}
                    {new Date(c.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className="text-slate-500">Total {c.totalStudents}</span>{' '}
                  <span className="font-semibold text-green-600">P {c.presentCount}</span>{' '}
                  <span className="font-semibold text-red-600">A {c.absentCount}</span>
                </div>
              </button>
              {open === i && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <IdList title="Present" rows={c.present} tone="text-green-600" />
                  <IdList title="Absent" rows={c.absent} tone="text-red-600" />
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  )
}