import { useEffect, useState } from 'react'
import { createSession, getSessionAttendees } from '../../services/attendanceService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

const fmtWhen = (t) => {
  const d = new Date(t)
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export default function GenerateQR() {
  const [form, setForm] = useState({ subject: '', year: '1', section: '' })
  const [session, setSession] = useState(null) // { sessionId, qrImage, expiresAt, expiresInSeconds, label }
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [attendees, setAttendees] = useState({ count: 0, students: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleGenerate = async (e) => {
    e?.preventDefault?.()
    setError('')
    setLoading(true)
    try {
      const data = await createSession({
        subject: form.subject.trim(),
        year: Number(form.year),
        section: form.section.trim(),
      })
      setAttendees({ count: 0, students: [] })
      setSession({ ...data, label: `${form.subject.trim()} · Year ${form.year} · Sec ${form.section.trim()}` })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create session')
    } finally {
      setLoading(false)
    }
  }

  // Countdown
  useEffect(() => {
    if (!session) return
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.round((new Date(session.expiresAt) - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [session])

  // Live list of students who have scanned. Polls every 3s until shortly after expiry.
  useEffect(() => {
    if (!session) return
    let stopped = false
    const fetchOnce = async () => {
      try {
        const d = await getSessionAttendees(session.sessionId)
        if (!stopped) setAttendees(d)
      } catch {
        /* ignore a failed poll */
      }
    }
    fetchOnce()
    const poll = setInterval(fetchOnce, 3000)
    const remaining = Math.max(0, new Date(session.expiresAt) - Date.now())
    const stop = setTimeout(() => {
      clearInterval(poll)
      fetchOnce()
    }, remaining + 2000)
    return () => {
      stopped = true
      clearInterval(poll)
      clearTimeout(stop)
    }
  }, [session])

  const expired = session && secondsLeft === 0
  const pct = session ? (secondsLeft / session.expiresInSeconds) * 100 : 0

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[320px_1fr]">
      <form onSubmit={handleGenerate} className="space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Attendance QR</h1>
        <p className="text-sm text-slate-500">
          Students scan this from their phones. The QR expires on its own, so a forwarded screenshot is useless.
        </p>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

        <input name="subject" required placeholder="Subject (e.g. DBMS)" className={inputCls} value={form.subject} onChange={set} />
        <div className="grid grid-cols-2 gap-2">
          <select name="year" className={inputCls} value={form.year} onChange={set}>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          <input name="section" required placeholder="Section (A)" className={inputCls} value={form.section} onChange={set} />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Generating...' : session ? 'Generate new QR' : 'Generate QR'}
        </button>

        <p className="text-xs text-slate-400">
          Type the subject the same way every time. Regenerating for the same subject on the same day counts as
          one class, so percentages stay correct. The class is automatically recorded as taken by you.
        </p>
      </form>

      <div className="rounded-xl border bg-white p-4">
        {!session ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Fill the form and generate a QR to start the class.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="text-center">
              <div className="relative mx-auto w-64">
                <img src={session.qrImage} alt="Attendance QR" className={`w-64 ${expired ? 'opacity-20' : ''}`} />
                {expired && (
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-red-600">
                    Expired
                  </div>
                )}
              </div>
              <div className="mt-3 text-3xl font-bold tabular-nums">{secondsLeft}s</div>
              <div className="mx-auto mt-2 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              {expired && (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="mt-3 rounded-lg border px-4 py-1.5 text-sm hover:bg-slate-50"
                >
                  Generate again
                </button>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-500">{session.label}</div>
              <div className="flex items-baseline justify-between">
                <div className="font-semibold">Present so far</div>
                <div className="text-2xl font-bold text-emerald-600">{attendees.count}</div>
              </div>
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
                {attendees.students.length === 0 && (
                  <li className="text-slate-400">Waiting for students to scan...</li>
                )}
                {attendees.students.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-1.5">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">Roll {s.rollNumber || '—'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">{s.markedAt ? fmtWhen(s.markedAt) : ''}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}