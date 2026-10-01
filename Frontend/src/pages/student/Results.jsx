import { useEffect, useState } from 'react'
import { getMyResults } from '../../services/examService'

export default function Results() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    getMyResults()
      .then((r) => setResults(r.data.results))
      .catch((e) => setErr(e.response?.data?.message || 'Results load nahi hue'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">My Results</h1>
        <p className="text-sm text-slate-500">Sirf aapka apna result, teacher ke approve karne ke baad.</p>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {loading && <div className="text-sm text-slate-400">Loading…</div>}
      {!loading && !err && results.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">Abhi koi result publish nahi hua.</div>
      )}

      {results.map((r) => (
        <div key={r._id} className="rounded-xl border border-blue-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{r.exam.title}</div>
              <div className="text-sm text-slate-500">{r.exam.subject} · Roll no: {r.rollNumber || '—'}</div>
              <div className="text-xs text-slate-400">{r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString('en-IN') : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{r.finalScore} / {r.exam.totalMarks}</div>
              <div className="text-sm text-slate-500">{r.percentage}%</div>
            </div>
          </div>

          {r.teacherNote && <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">Teacher: {r.teacherNote}</div>}

          <button onClick={() => setOpen(open === r._id ? null : r._id)} className="mt-3 text-sm text-blue-600 hover:underline">
            {open === r._id ? 'Hide answers' : 'View answers'}
          </button>

          {open === r._id && (
            <div className="mt-3 space-y-3">
              {r.review.map((q, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex justify-between gap-2 text-sm font-medium">
                    <span>Q{i + 1}. {q.text}</span>
                    <span className="shrink-0 text-xs text-slate-500">{q.awarded}/{q.marks}</span>
                  </div>
                  <div className="space-y-1">
                    {q.options.map((o, j) => {
                      const correct = j === q.correctIndex
                      const picked = j === q.selected
                      let cls = 'border-slate-200'
                      if (correct) cls = 'border-emerald-400 bg-emerald-50'
                      if (picked && !correct) cls = 'border-red-400 bg-red-50'
                      return (
                        <div key={j} className={`flex justify-between rounded border px-3 py-1.5 text-sm ${cls}`}>
                          <span><b>{'ABCD'[j]}.</b> {o}</span>
                          <span className="text-xs">
                            {picked && <span className="mr-2 text-blue-700">Your answer</span>}
                            {correct && <span className="text-emerald-700">Correct</span>}
                          </span>
                        </div>
                      )
                    })}
                    {q.selected === null && <div className="text-xs text-amber-600">Not answered</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}