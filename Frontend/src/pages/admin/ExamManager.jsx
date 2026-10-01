import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { aiGenerateQuestions, createExam, deleteExam, getManagedExams } from '../../services/examService'

const emptyQuestion = () => ({ text: '', options: ['', '', '', ''], correctIndex: 0, marks: 1 })
const errMsg = (e, fallback) => e.response?.data?.message || fallback
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

export default function ExamManager() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'

  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [form, setForm] = useState({ title: '', subject: '', department: '', year: '', section: '', durationMinutes: 30 })
  const [questions, setQuestions] = useState([])
  const [ai, setAi] = useState({ topic: '', count: 5, marksPerQuestion: 1, difficulty: 'medium' })
  const [aiBusy, setAiBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const flash = (type, text) => setMsg({ type, text })

  const load = async () => {
    try {
      const { data } = await getManagedExams()
      setExams(data.exams)
    } catch (e) {
      flash('error', errMsg(e, 'Exams load nahi hue'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)

  const updateQuestion = (i, patch) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))

  const updateOption = (i, j, value) =>
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === i ? { ...q, options: q.options.map((o, k) => (k === j ? value : o)) } : q))
    )

  const generate = async () => {
    if (!ai.topic.trim()) return flash('error', 'Pehle topic likho (jaise: SQL joins, Normalization)')
    setAiBusy(true)
    setMsg({ type: '', text: '' })
    try {
      const { data } = await aiGenerateQuestions({
        subject: form.subject,
        topic: ai.topic,
        count: Number(ai.count) || 5,
        marksPerQuestion: Number(ai.marksPerQuestion) || 1,
        difficulty: ai.difficulty,
      })
      setQuestions((qs) => [...qs, ...data.questions])
      flash('success', `${data.questions.length} questions AI ne bana diye. Neeche check/edit kar lo.`)
    } catch (e) {
      flash('error', errMsg(e, 'AI se questions nahi bane, dobara try karo'))
    } finally {
      setAiBusy(false)
    }
  }

  const publish = async () => {
    if (!form.title.trim() || !form.subject.trim()) return flash('error', 'Exam name aur subject zaroori hai')
    if (!(Number(form.durationMinutes) >= 1)) return flash('error', 'Duration (minutes) sahi likho')
    if (!questions.length) return flash('error', 'Kam se kam 1 question add karo')
    const bad = questions.findIndex((q) => !q.text.trim() || q.options.some((o) => !o.trim()))
    if (bad !== -1) return flash('error', `Question ${bad + 1} me question ya koi option khali hai`)

    setSaving(true)
    try {
      await createExam({
        ...form,
        year: form.year || null,
        durationMinutes: Number(form.durationMinutes),
        questions,
      })
      flash('success', 'Exam publish ho gaya. Students ko Exams section me dikhega.')
      setForm({ title: '', subject: '', department: '', year: '', section: '', durationMinutes: 30 })
      setQuestions([])
      setShowForm(false)
      load()
    } catch (e) {
      flash('error', errMsg(e, 'Exam publish nahi hua'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (exam) => {
    if (!window.confirm(`"${exam.title}" delete karna hai? Saare students ke attempts bhi delete ho jayenge.`)) return
    try {
      await deleteExam(exam._id)
      load()
    } catch (e) {
      flash('error', errMsg(e, 'Delete nahi hua'))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Class Tests</h1>
          <p className="text-sm text-slate-500">MCQ exam banao, submissions check karo aur result approve karo.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Close' : '+ Create exam'}
        </button>
      </div>

      {msg.text && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="space-y-5 rounded-xl border border-blue-100 bg-white p-4">
          <h2 className="font-semibold">Exam details</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Exam name
              <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Unit Test 1" />
            </label>
            <label className="text-sm">
              Subject
              <input className={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="DBMS" />
            </label>
            <label className="text-sm">
              Time (minutes)
              <input type="number" min="1" max="300" className={input} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </label>
            <label className="text-sm">
              Year (blank = all)
              <select className={input} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                <option value="">All years</option>
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Section (blank = all)
              <input className={input} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </label>
            {isAdmin ? (
              <label className="text-sm">
                Department (blank = all)
                <input className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="CSE" />
              </label>
            ) : (
              <div className="text-sm">
                Department
                <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-slate-600">{user.branch || '—'}</div>
              </div>
            )}
          </div>

          {/* AI generator */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-violet-800">AI se questions banao</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm sm:col-span-2">
                Topic
                <input className={input} value={ai.topic} onChange={(e) => setAi({ ...ai, topic: e.target.value })} placeholder="SQL joins, normalization, ER diagram" />
              </label>
              <label className="text-sm">
                Kitne questions
                <input type="number" min="1" max="30" className={input} value={ai.count} onChange={(e) => setAi({ ...ai, count: e.target.value })} />
              </label>
              <label className="text-sm">
                Marks per question
                <input type="number" min="1" className={input} value={ai.marksPerQuestion} onChange={(e) => setAi({ ...ai, marksPerQuestion: e.target.value })} />
              </label>
              <label className="text-sm">
                Difficulty
                <select className={input} value={ai.difficulty} onChange={(e) => setAi({ ...ai, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>
            <button
              onClick={generate}
              disabled={aiBusy}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {aiBusy ? 'AI questions bana raha hai…' : 'Generate with AI'}
            </button>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Questions ({questions.length}) · Total marks: {totalMarks}
              </h3>
              <button onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])} className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50">
                + Add question manually
              </button>
            </div>

            {questions.length === 0 && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Abhi koi question nahi hai. AI se banao ya manually add karo.
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">Q{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">
                      Marks{' '}
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                        value={q.marks}
                        onChange={(e) => updateQuestion(i, { marks: e.target.value })}
                      />
                    </label>
                    <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  className={input}
                  placeholder="Question likho"
                  value={q.text}
                  onChange={(e) => updateQuestion(i, { text: e.target.value })}
                />
                <div className="mt-2 space-y-2">
                  {q.options.map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correctIndex === j}
                        onChange={() => updateQuestion(i, { correctIndex: j })}
                        title="Sahi answer"
                      />
                      <span className="w-5 text-sm font-medium">{'ABCD'[j]}</span>
                      <input className={input} placeholder={`Option ${'ABCD'[j]}`} value={o} onChange={(e) => updateOption(i, j, e.target.value)} />
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">Radio button se sahi answer select karo.</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={publish}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Publishing…' : 'Publish exam'}
          </button>
        </div>
      )}

      {/* Exam list */}
      <div className="space-y-3">
        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {!loading && exams.length === 0 && (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">Abhi tak koi exam nahi banaya.</div>
        )}
        {exams.map((e) => (
          <div key={e._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-4">
            <div>
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-slate-500">
                {e.subject} · {e.questionCount} questions · {e.totalMarks} marks · {e.durationMinutes} min
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {e.department || 'All departments'}
                {e.year ? ` · Year ${e.year}` : ''}
                {e.section ? ` · Sec ${e.section}` : ''}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">Writing: {e.inProgress}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Needs review: {e.submitted}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Approved: {e.approved}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/admin/exams/${e._id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                Submissions
              </Link>
              <button onClick={() => remove(e)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}