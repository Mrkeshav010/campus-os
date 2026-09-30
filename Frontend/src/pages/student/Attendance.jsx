import { useCallback, useEffect, useState } from 'react'
import QRScanner from '../../components/common/QRScanner'
import { getMyAttendance, markAttendance } from '../../services/attendanceService'

const tone = (p) =>
  p < 75
    ? { bar: 'bg-red-500', text: 'text-red-600' }
    : p < 85
      ? { bar: 'bg-amber-500', text: 'text-amber-600' }
      : { bar: 'bg-emerald-500', text: 'text-emerald-600' }

// Below 75%: classes to attend in a row to get back to 75% (x >= 3T - 4P).
// Above 75%: classes that can still be missed while staying at 75% or more.
const advice = (s) => {
  if (s.presentCount / s.totalClasses < 0.75) {
    return { bad: true, text: `Attend the next ${3 * s.totalClasses - 4 * s.presentCount} classes to reach 75%` }
  }
  const canMiss = Math.floor((4 * s.presentCount) / 3 - s.totalClasses)
  return {
    bad: false,
    text:
      canMiss > 0
        ? `You can miss ${canMiss} more class${canMiss > 1 ? 'es' : ''} and stay above 75%`
        : 'Right at 75%. Do not miss the next class.',
  }
}

export default function Attendance() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [result, setResult] = useState(null) // { ok, message }

  const load = useCallback(async () => {
    try {
      setSubjects(await getMyAttendance())
    } catch {
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleScan = async (code) => {
    setScanning(false)
    try {
      await markAttendance(code)
      setResult({ ok: true, message: 'Attendance marked. You are present!' })
      load()
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || 'Could not mark attendance' })
    }
  }

  const handleCameraError = (msg) => {
    setScanning(false)
    setResult({ ok: false, message: `Camera error: ${msg}. Allow camera permission and try again.` })
  }

  const totals = subjects.reduce(
    (a, s) => ({ p: a.p + s.presentCount, t: a.t + s.totalClasses }),
    { p: 0, t: 0 }
  )
  const overall = totals.t ? Math.round((totals.p / totals.t) * 1000) / 10 : null

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-slate-500">
            {overall === null ? 'No classes recorded yet' : `Overall ${overall}% (${totals.p}/${totals.t} classes)`}
          </p>
        </div>
        <button
          onClick={() => {
            setResult(null)
            setScanKey((k) => k + 1)
            setScanning(true)
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Scan class QR
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg p-3 text-sm ${
            result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {result.message}
        </div>
      )}

      {scanning && (
        <div className="rounded-xl border bg-white p-4">
          <QRScanner key={scanKey} onScan={handleScan} onError={handleCameraError} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Point the camera at the QR on your faculty's screen. Camera works on localhost or HTTPS only.</span>
            <button onClick={() => setScanning(false)} className="rounded border px-3 py-1 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          No attendance yet. Scan the QR when your faculty starts a class.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => {
            const t = tone(s.percentage)
            const a = advice(s)
            return (
              <div key={s.subject} className="rounded-xl border bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold">{s.subject}</div>
                  <div className={`text-2xl font-bold ${t.text}`}>{s.percentage}%</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${t.bar}`} style={{ width: `${Math.min(100, s.percentage)}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {s.presentCount} present of {s.totalClasses} classes
                </div>
                <div className={`mt-1 text-xs ${a.bad ? 'text-red-600' : 'text-slate-500'}`}>{a.text}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}