import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { approveAttempt, getAttempt } from '../../services/examService'

export default function ExamReview() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [marks, setMarks] = useState({})
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAttempt(attemptId)
      .then((r) => {
        setData(r.data)
        const m = {}
        r.data.review.forEach((q) => {
          m[q.questionId] = q.awarded
        })
        setMarks(m)
        setNote(r.data.attempt.teacherNote || '')
      })
      .catch((e) => setErr(e.response?.data?.message || 'Answer sheet load nahi hui'))
  }, [attemptId])

  if (err) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{err}</div>
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>

  const { attempt, exam, review } = data
  const total = review.reduce((s, q) => s + (Number(marks[q.questionId]) || 0), 0)
  const isApproved = attempt.status === 'approved'

  const approve = async () => {
    setSaving(true)
    setErr('')
    try {
      await approveAttempt(attemptId, {
        overrides: review.map((q) => ({ questionId: q.questionId, awarded: Number(marks[q.questionId]) || 0 })),
        note,
      })
      navigate(`/admin/exams/${exam._id}`)
    } catch (e) {
      setErr(e.response?.data?.message || 'Approve nahi hua')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link to={`/admin/exams/${exam._id}`} className="text-sm text-blue-600">← Back to submissions</Link>

      <div className="rounded-xl border border-blue-100 bg-white p-4">
        <h1 className="text-lg font-bold">{exam.title} · {exam.subject}</h1>
        <p className="text-sm text-slate-600">
          {attempt.studentName} · Roll no: <b>{attempt.rollNumber || '—'}</b>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          AI check score: {attempt.autoScore} / {exam.totalMarks}
          {attempt.autoSubmitted ? ' · auto-submitted (time over)' : ''}
        </p>
        <p className="mt-2 text-base font-semibold">
          Final marks: {total} / {exam.totalMarks}
        </p>
      </div>

      {review.map((q, i) => (
        <div key={q.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="text-sm font-semibold">Q{i + 1}. {q.text}</div>
            <label className="shrink-0 text-xs text-slate-500">
              Marks{' '}
              <input
                type="number"
                min="0"
                max={q.marks}
                step="0.5"
                className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                value={marks[q.questionId] ?? 0}
                onChange={(e) => setMarks({ ...marks, [q.questionId]: e.target.value })}
              />{' '}
              / {q.marks}
            </label>
          </div>
          <div className="space-y-1">
            {q.options.map((o, j) => {
              const isCorrect = j === q.correctIndex
              const isSelected = j === q.selected
              let cls = 'border-slate-200'
              if (isCorrect) cls = 'border-emerald-400 bg-emerald-50'
              if (isSelected && !isCorrect) cls = 'border-red-400 bg-red-50'
              return (
                <div key={j} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${cls}`}>
                  <span>
                    <b>{'ABCD'[j]}.</b> {o}
                  </span>
                  <span className="text-xs">
                    {isSelected && <span className="mr-2 font-medium text-blue-700">Student's answer</span>}
                    {isCorrect && <span className="font-medium text-emerald-700">Correct</span>}
                  </span>
                </div>
              )
            })}
            {q.selected === null && <div className="text-xs text-amber-600">Student ne is question ka answer nahi diya.</div>}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-blue-100 bg-white p-4">
        <label className="text-sm">
          Teacher note (optional, student ko dikhega)
          <textarea
            rows={2}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          onClick={approve}
          disabled={saving}
          className="mt-3 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isApproved ? 'Update result' : 'Approve & publish result'}
        </button>
        <p className="mt-2 text-xs text-slate-400">Approve karte hi sirf is student ko uska result dikhega.</p>
      </div>
    </div>
  )
}