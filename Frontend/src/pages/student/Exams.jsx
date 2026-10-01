import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStudentExams } from '../../services/examService'

export default function Exams() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    getStudentExams()
      .then((r) => setExams(r.data.exams))
      .catch((e) => setErr(e.response?.data?.message || 'Exams load nahi hue'))
      .finally(() => setLoading(false))
  }, [])

  const start = (e) => {
    const ok = window.confirm(
      `"${e.title}" start karna hai?\n\nTime: ${e.durationMinutes} minutes. Start hote hi timer chalu ho jayega aur ruk nahi sakta.\nHar question ka answer sirf ek baar change kar sakte ho.\nTime khatam hone par exam auto-submit ho jayega.`
    )
    if (ok) navigate(`/student/exams/${e._id}/take`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Exams</h1>
        <p className="text-sm text-slate-500">Aapke liye available class tests.</p>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {loading && <div className="text-sm text-slate-400">Loading…</div>}
      {!loading && !err && exams.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">Abhi koi exam available nahi hai.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {exams.map((e) => (
          <div key={e._id} className="rounded-xl border border-blue-100 bg-white p-4">
            <div className="font-semibold text-blue-800">{e.title}</div>
            <div className="text-sm text-slate-600">{e.subject}</div>
            <div className="mt-2 text-xs text-slate-500">
              {e.questionCount} questions · {e.totalMarks} marks · {e.durationMinutes} min
              {e.createdBy?.name ? ` · by ${e.createdBy.name}` : ''}
            </div>

            <div className="mt-3">
              {e.attemptStatus === 'not_started' && (
                <button onClick={() => start(e)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
                  Start exam
                </button>
              )}
              {e.attemptStatus === 'in_progress' && (
                <button onClick={() => navigate(`/student/exams/${e._id}/take`)} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm text-white hover:bg-amber-600">
                  Resume exam
                </button>
              )}
              {e.attemptStatus === 'submitted' && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">Submitted · result awaiting teacher approval</span>
              )}
              {e.attemptStatus === 'approved' && (
                <Link to="/student/results" className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  Result available → View
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}