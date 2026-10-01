import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { getEventDetail, saveEvent, toInputDate } from '../../services/eventService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const types = ['hackathon', 'function', 'workshop', 'seminar', 'notice']

const empty = {
  title: '',
  details: '',
  type: 'workshop',
  date: '',
  time: '',
  venue: '',
  registrationDeadline: '',
  externalLink: '',
  audienceAdmin: false,
  audienceFaculty: false,
  audienceStudents: true,
  year: '',
  branch: '',
  section: '',
  registrationRequired: false,
  minTeamSize: 1,
  maxTeamSize: 1,
}

export default function EventForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [poster, setPoster] = useState(null)
  const [currentPoster, setCurrentPoster] = useState('')
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    getEventDetail(id)
      .then(({ event: e }) => {
        setForm({
          title: e.title,
          details: e.details,
          type: e.type,
          date: toInputDate(e.date),
          time: e.time || '',
          venue: e.venue || '',
          registrationDeadline: toInputDate(e.registrationDeadline),
          externalLink: e.externalLink || '',
          audienceAdmin: e.audience.admin,
          audienceFaculty: e.audience.faculty,
          audienceStudents: e.audience.students,
          year: e.studentFilter?.year ? String(e.studentFilter.year) : '',
          branch: e.studentFilter?.branch || '',
          section: e.studentFilter?.section || '',
          registrationRequired: e.registrationRequired,
          minTeamSize: e.minTeamSize,
          maxTeamSize: e.maxTeamSize,
        })
        setCurrentPoster(e.posterUrl || '')
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the event'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const toggle = (name) => setForm({ ...form, [name]: !form[name] })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      if (poster) fd.append('poster', poster)
      await saveEvent(id, fd)
      navigate('/organizer')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the event')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading...</div>

  const check = (name, label) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form[name]} onChange={() => toggle(name)} />
      {label}
    </label>
  )

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-white p-5">
      <h1 className="text-xl font-bold">{id ? 'Edit event' : 'Post an event / notice'}</h1>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      <input name="title" required placeholder="Title" className={inputCls} value={form.title} onChange={set} />
      <textarea name="details" required rows={5} placeholder="Details" className={inputCls} value={form.details} onChange={set} />

      <div className="grid gap-2 sm:grid-cols-2">
        <select name="type" className={inputCls} value={form.type} onChange={set}>
          {types.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <input name="venue" required placeholder="Venue" className={inputCls} value={form.venue} onChange={set} />
        <div>
          <label className="text-xs text-slate-500">Date</label>
          <input name="date" type="date" required className={inputCls} value={form.date} onChange={set} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Time</label>
          <input name="time" type="time" className={inputCls} value={form.time} onChange={set} />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500">Poster / brochure (optional, image or PDF, max 5 MB)</label>
        {currentPoster && !poster && <div className="mb-1 text-xs text-slate-400">A poster is already uploaded. Choose a file to replace it.</div>}
        <input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={(e) => setPoster(e.target.files[0] || null)} className="block w-full text-sm" />
      </div>

      <input
        name="externalLink"
        placeholder="External link, e.g. Google Form (optional)"
        className={inputCls}
        value={form.externalLink}
        onChange={set}
      />

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <div className="text-xs font-medium text-slate-500">Who can see this?</div>
        <div className="flex flex-wrap gap-4">
          {check('audienceAdmin', 'Admin')}
          {check('audienceFaculty', 'HOD / Faculty')}
          {check('audienceStudents', 'Students')}
        </div>
        {form.audienceStudents && (
          <div className="grid grid-cols-3 gap-2 pt-1">
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
            <input name="section" placeholder="Any section" className={inputCls} value={form.section} onChange={set} />
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        {check('registrationRequired', 'Registration needed')}
        {form.registrationRequired && (
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">Last date to register</label>
              <input name="registrationDeadline" type="date" required className={inputCls} value={form.registrationDeadline} onChange={set} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Min team size</label>
              <input name="minTeamSize" type="number" min={1} max={20} className={inputCls} value={form.minTeamSize} onChange={set} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Max team size</label>
              <input name="maxTeamSize" type="number" min={1} max={20} className={inputCls} value={form.maxTeamSize} onChange={set} />
            </div>
            <p className="text-xs text-slate-400 sm:col-span-3">Team size includes the leader. Solo event = min 1, max 1.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          disabled={saving}
          className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : id ? 'Save changes' : 'Post'}
        </button>
        <button type="button" onClick={() => navigate('/organizer')} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}