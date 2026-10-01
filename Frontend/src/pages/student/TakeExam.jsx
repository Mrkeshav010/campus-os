import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { saveAnswer, startExam, submitExam } from '../../services/examService'

const fmt = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const rr = String(r).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${rr}` : `${mm}:${rr}`
}

export default function TakeExam() {
  const { id } = useParams()

  const [phase, setPhase] = useState('loading') // loading | running | done | blocked
  const [info, setInfo] = useState('')
  const [notice, setNotice] = useState('')
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [maxSel, setMaxSel] = useState(2)
  const [endsAtMs, setEndsAtMs] = useState(0)
  const [left, setLeft] = useState(0)
  const [current, setCurrent] = useState(0)
  const [busy, setBusy] = useState(false)

  const offsetRef = useRef(0)
  const doneRef = useRef(false)
  const savingRef = useRef(false)

  // Load (or resume) the exam
  useEffect(() => {
    let alive = true
    startExam(id)
      .then(({ data }) => {
        if (!alive) return
        const ends = new Date(data.endsAt).getTime()
        offsetRef.current = data.serverNow - Date.now()
        setExam(data.exam)
        setQuestions(data.questions)
        setAnswers(data.answers || {})
        setMaxSel(data.maxSelections || 2)
        setEndsAtMs(ends)
        setLeft(Math.max(0, Math.floor((ends - (Date.now() + offsetRef.current)) / 1000)))
        setPhase('running')
      })
      .catch((e) => {
        if (!alive) return
        const d = e.response?.data
        if (d?.autoSubmitted) {
          doneRef.current = true
          setInfo(d.message)
          setPhase('done')
          return
        }
        setInfo(d?.message || 'Exam load nahi hua')
        setPhase('blocked')
      })
    return () => {
      alive = false
    }
  }, [id])

  const finish = useCallback(
    async (auto) => {
      if (doneRef.current) return
      doneRef.current = true
      setBusy(true)
      try {
        const { data } = await submitExam(id)
        setInfo(auto ? 'Time khatam! Aapka exam auto-submit ho gaya.' : data.message)
        setPhase('done')
      } catch (e) {
        if (auto) {
          setInfo('Time khatam. Exam auto-submit ho jayega.')
          setPhase('done')
        } else {
          doneRef.current = false
          setNotice(e.response?.data?.message || 'Submit nahi hua. Internet check karke dobara try karo.')
        }
      } finally {
        setBusy(false)
      }
    },
    [id]
  )

  // Countdown (uses server time offset, so changing PC clock does not help)
  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      const s = Math.max(0, Math.floor((endsAtMs - (Date.now() + offsetRef.current)) / 1000))
      setLeft(s)
      if (s <= 0) finish(true)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [phase, endsAtMs, finish])

  // Warn before closing / refreshing the tab during the exam
  useEffect(() => {
    if (phase !== 'running') return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  const choose = async (q, idx) => {
    if (savingRef.current || doneRef.current) return
    const a = answers[q._id]
    if (a && a.selected === idx) return
    if (a && a.selections >= maxSel) {
      setNotice('Is question ka answer lock ho chuka hai (sirf ek baar change kar sakte ho).')
      return
    }
    if (a && a.selections === maxSel - 1) {
      const ok = window.confirm('Ye aapka aakhri change hai. Iske baad is question ka answer lock ho jayega. Continue?')
      if (!ok) return
    }

    savingRef.current = true
    setNotice('')
    try {
      const { data } = await saveAnswer(id, { questionId: q._id, selected: idx })
      setAnswers((p) => ({ ...p, [q._id]: { selected: data.selected, selections: data.selections } }))
    } catch (e) {
      const d = e.response?.data
      if (d?.autoSubmitted) {
        doneRef.current = true
        setInfo(d.message)
        setPhase('done')
      } else {
        if (d?.locked) setAnswers((p) => ({ ...p, [q._id]: { ...p[q._id], selections: maxSel } }))
        setNotice(d?.message || 'Answer save nahi hua, dobara click karo.')
      }
    } finally {
      savingRef.current = false
    }
  }

  const submitNow = () => {
    const unanswered = questions.length - Object.keys(answers).length
    const text = unanswered
      ? `${unanswered} question(s) abhi bhi unanswered hain. Fir bhi submit karna hai?`
      : 'Exam submit karna hai? Submit ke baad changes nahi ho sakte.'
    if (window.confirm(text)) finish(false)
  }

  if (phase === 'loading') return <div className="text-sm text-slate-400">Exam load ho raha hai…</div>

  if (phase === 'blocked') {
    return (
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-6 text-center">
        <p className="text-sm text-red-600">{info}</p>
        <Link to="/student/exams" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Back to exams</Link>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-white p-6 text-center">
        <div className="text-2xl">✅</div>
        <h2 className="mt-2 text-lg font-bold">Exam submitted</h2>
        <p className="mt-1 text-sm text-slate-600">{info}</p>
        <p className="mt-1 text-xs text-slate-400">Teacher check karke approve karenge, tab Results section me aapka result dikhega.</p>
        <Link to="/student/exams" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Back to exams</Link>
      </div>
    )
  }

  const q = questions[current]
  const a = answers[q._id]
  const answered = Object.keys(answers).length
  const low = left <= 60

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
        <div>
          <div className="text-sm font-bold">{exam.title}</div>
          <div className="text-xs text-slate-500">{exam.subject} · {answered}/{questions.length} answered</div>
        </div>
        <div className={`rounded-lg px-3 py-1 text-lg font-bold tabular-nums ${low ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          ⏱ {fmt(left)}
        </div>
      </div>

      {notice && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="font-semibold">Q{current + 1}. {q.text}</div>
          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
        </div>

        <div className="space-y-2">
          {q.options.map((o, j) => {
            const selected = a?.selected === j
            const locked = a && a.selections >= maxSel && !selected
            return (
              <button
                key={j}
                onClick={() => choose(q, j)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                  {'ABCD'[j]}
                </span>
                {o}
              </button>
            )
          })}
        </div>

        <div className="mt-2 text-xs text-slate-400">
          {!a && 'Ek option chuno.'}
          {a && a.selections < maxSel && `Aap is answer ko ${maxSel - a.selections} baar aur change kar sakte ho.`}
          {a && a.selections >= maxSel && 'Answer lock ho gaya hai.'}
        </div>

        <div className="mt-4 flex justify-between">
          <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="rounded-lg border px-4 py-1.5 text-sm disabled:opacity-40">
            ← Previous
          </button>
          <button disabled={current === questions.length - 1} onClick={() => setCurrent((c) => c + 1)} className="rounded-lg border px-4 py-1.5 text-sm disabled:opacity-40">
            Next →
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-xs text-slate-500">Questions</div>
        <div className="flex flex-wrap gap-2">
          {questions.map((x, i) => (
            <button
              key={x._id}
              onClick={() => setCurrent(i)}
              className={`h-8 w-8 rounded-md border text-xs font-medium ${
                i === current ? 'border-blue-600 ring-2 ring-blue-200' : ''
              } ${answers[x._id] ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-600'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={submitNow}
        disabled={busy}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? 'Submitting…' : 'Submit exam'}
      </button>
    </div>
  )
}