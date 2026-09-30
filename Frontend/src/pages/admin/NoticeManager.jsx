import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { createNotice, deleteNotice, getAllNotices } from '../../services/noticeService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

const empty = { title: '', body: '', audience: 'students', year: '', branch: '', hostelBlock: '' }

const audiences = [
  ['students', 'Students'],
  ['faculty', 'Faculty'],
  ['both', 'Both'],
]

const filterText = (f = {}) => {
  const parts = []
  if (f.year) parts.push(`Year ${f.year}`)
  if (f.branch) parts.push(f.branch)
  if (f.hostelBlock) parts.push(`Hostel ${f.hostelBlock}`)
  return parts.length ? parts.join(' · ') : 'All students'
}

const whoLabel = (a) => (a === 'faculty' ? 'Faculty only' : a === 'both' ? 'Students + Faculty' : 'Students')

export default function NoticeManager() {
  const [notices, setNotices] = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      setNotices(await getAllNotices())
    } catch {
      /* keep the old list */
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {})
  }, [load])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const showFilters = form.audience !== 'faculty'

  const reach = () => {
    const students = filterText({ year: form.year, branch: form.branch, hostelBlock: form.hostelBlock.trim() })
    if (form.audience === 'faculty') return 'All faculty (teachers and HODs)'
    if (form.audience === 'both') return `${students} + all faculty`
    return students
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSending(true)
    try {
      const data = await createNotice({
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        targetFilter: showFilters
          ? {
              year: form.year || null,
              branch: form.branch || null,
              hostelBlock: form.hostelBlock.trim() || null,
            }
          : {},
      })
      setInfo(data.message)
      setForm(empty)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post the notice')
    } finally {
      setSending(false)
    }
  }

  const remove = async (n) => {
    if (!window.confirm(`Delete the notice "${n.title}"? This cannot be undone.`)) return
    setError('')
    setInfo('')
    setBusy(n._id)
    try {
      await deleteNotice(n._id)
      setInfo('Notice deleted')
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the notice')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Post a notice</h1>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {info && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

        <input name="title" required placeholder="Title" className={inputCls} value={form.title} onChange={set} />
        <textarea name="body" required rows={5} placeholder="Notice text" className={inputCls} value={form.body} onChange={set} />

        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">Send to</div>
          <div className="grid grid-cols-3 gap-2">
            {audiences.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setForm({ ...form, audience: value })}
                className={`rounded-lg border px-2 py-2 text-sm ${
                  form.audience === value
                    ? 'border-emerald-600 bg-emerald-600 font-medium text-white'
                    : 'hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="mb-2 text-xs font-medium text-slate-500">
              Which students? Leave blank for all students.
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select name="year" className={inputCls} value={form.year} onChange={set}>
                <option value="">Any year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <select name="branch" className={inputCls} value={form.branch} onChange={set}>
                <option value="">Any branch</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input name="hostelBlock" placeholder="Hostel" className={inputCls} value={form.hostelBlock} onChange={set} />
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          Will reach: <span className="font-medium">{reach()}</span>
        </div>

        <button
          disabled={sending}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {sending ? 'Posting...' : 'Post notice'}
        </button>
        <p className="text-xs text-slate-400">Everyone who gets it also gets a live alert and a push notification.</p>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">Posted notices</h2>
        {notices.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Nothing posted yet.</div>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n._id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className="text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-700">
                    {whoLabel(n.audience)}
                  </span>
                  {n.audience !== 'faculty' && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
                      {filterText(n.targetFilter)}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{n.body}</p>
                <div className="mt-3 text-right">
                  <button
                    onClick={() => remove(n)}
                    disabled={busy === n._id}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {busy === n._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}