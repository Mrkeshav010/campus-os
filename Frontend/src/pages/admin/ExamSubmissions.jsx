import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubmissions } from '../../services/examService'

const badge = {
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
}

export default function ExamSubmissions() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    getSubmissions(id)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.message || 'Submissions load nahi hue'))
  }, [id])

  if (err) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{err}</div>
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>

  const { exam, attempts } = data

  return (
    <div className="space-y-4">
      <Link to="/admin/exams" className="text-sm text-blue-600">← Back to exams</Link>
      <div>
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <p className="text-sm text-slate-500">
          {exam.subject} · Total {exam.totalMarks} marks · {attempts.length} submission{attempts.length === 1 ? '' : 's'}
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">Abhi kisi student ne submit nahi kiya.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Roll no</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">AI check score</th>
                <th className="px-4 py-2">Final</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-2 font-medium">{a.rollNumber || '—'}</td>
                  <td className="px-4 py-2">{a.studentName}</td>
                  <td className="px-4 py-2">{a.autoScore} / {exam.totalMarks}</td>
                  <td className="px-4 py-2">{a.finalScore ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge[a.status] || ''}`}>
                      {a.status === 'submitted' ? 'Needs review' : 'Approved'}
                    </span>
                    {a.autoSubmitted && <span className="ml-1 text-xs text-slate-400">(auto)</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/admin/exams/attempt/${a._id}`} className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
                      {a.status === 'approved' ? 'View' : 'Review'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}