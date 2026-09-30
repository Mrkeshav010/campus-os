import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const AUD = { students: 'Students', faculty: 'Teachers', both: 'Teachers + Students' }

const when = (t) =>
  new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function NoticeItem({ n, onDelete }) {
  const f = n.targetFilter || {}
  const target = [f.year ? `Year ${f.year}` : null, f.section ? `Sec ${f.section}` : null].filter(Boolean).join(' · ')
  return (
    <li className="rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium text-slate-800">{n.title}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{AUD[n.audience] || 'Students'}</span>
          {target && n.audience !== 'faculty' && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">{target}</span>
          )}
        </div>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{n.body}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {n.postedBy?.name ? `${n.postedBy.name} · ` : ''}
          {when(n.createdAt)}
        </span>
        {onDelete && (
          <button onClick={() => onDelete(n._id)} className="text-red-500 hover:underline">
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function HodNotices() {
  const { user } = useAuth()
  const myId = user._id || user.id
  const [form, setForm] = useState({ title: '', body: '', audience: 'students', year: '', section: '' })
  const [tab, setTab] = useState('mine')
  const [mine, setMine] = useState([])
  const [received, setReceived] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const load = () => {
    api.get('/notices/mine').then((r) => setMine(r.data.notices)).catch(() => {})
    api
      .get('/notices/faculty')
      .then((r) => setReceived(r.data.notices.filter((n) => String(n.postedBy?._id) !== String(myId))))
      .catch(() => {})
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setSaving(true)
    try {
      const toStudents = form.audience !== 'faculty'
      const r = await api.post('/notices', {
        title: form.title,
        body: form.body,
        audience: form.audience,
        targetFilter: toStudents ? { year: form.year || null, section: form.section || null } : null,
      })
      setMsg(r.data.message)
      setForm({ ...form, title: '', body: '' })
      setTab('mine')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post notice')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this notice?')) return
    try {
      await api.delete(`/notices/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    }
  }

  const showStudentFilters = form.audience !== 'faculty'

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Post a notice</h1>
        <p className="text-sm text-slate-500">
          Goes only to {user.branch || 'your'} department. Teachers and students see it on their own notice page.
        </p>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {msg && <div className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{msg}</div>}

        <input name="title" required placeholder="Title" className={inputCls} value={form.title} onChange={set} />
        <textarea name="body" required rows={5} placeholder="Write the notice…" className={inputCls} value={form.body} onChange={set} />

        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">Send to</div>
          <select name="audience" className={inputCls} value={form.audience} onChange={set}>
            <option value="students">Students</option>
            <option value="faculty">Teachers</option>
            <option value="both">Teachers + Students</option>
          </select>
        </div>

        {showStudentFilters && (
          <div className="grid grid-cols-2 gap-2">
            <select name="year" className={inputCls} value={form.year} onChange={set}>
              <option value="">All years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
            <input name="section" placeholder="Section (blank = all)" className={inputCls} value={form.section} onChange={set} />
          </div>
        )}

        <button
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Posting…' : 'Post notice'}
        </button>
      </form>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex gap-2 border-b">
          {[
            ['mine', `Posted by me (${mine.length})`],
            ['received', `From admin (${received.length})`],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'mine' ? (
          mine.length === 0 ? (
            <div className="text-sm text-slate-400">You have not posted any notice yet.</div>
          ) : (
            <ul className="space-y-2">
              {mine.map((n) => (
                <NoticeItem key={n._id} n={n} onDelete={remove} />
              ))}
            </ul>
          )
        ) : received.length === 0 ? (
          <div className="text-sm text-slate-400">No notices from admin.</div>
        ) : (
          <ul className="space-y-2">
            {received.map((n) => (
              <NoticeItem key={n._id} n={n} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}