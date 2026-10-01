import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fmtDate, getEventDetail, registerForEvent } from '../../services/eventService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const blank = { name: '', rollNumber: '', email: '', phone: '' }

export default function EventRegister() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [me, setMe] = useState(null)
  const [already, setAlready] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [leaderPhone, setLeaderPhone] = useState('')
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEventDetail(id)
      .then((d) => {
        setEvent(d.event)
        setMe(d.me)
        setAlready(d.myRegistration)
        setLeaderPhone(d.me?.phone || '')
        // start with the minimum number of member rows (team size includes the leader)
        setMembers(Array.from({ length: Math.max(d.event.minTeamSize - 1, 0) }, () => ({ ...blank })))
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the event'))
  }, [id])

  const setMember = (i, field, value) =>
    setMembers(members.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await registerForEvent(id, { teamName, leaderPhone, members })
      navigate('/student/events')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  if (!event) return <div className="text-sm text-slate-500">{error || 'Loading...'}</div>

  const closed = event.registrationDeadline && new Date(event.registrationDeadline) < new Date()
  const maxMembers = event.maxTeamSize - 1
  const minMembers = event.minTeamSize - 1

  if (already || closed || !event.registrationRequired) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6 text-center">
        <h1 className="text-lg font-bold">{event.title}</h1>
        <p className="text-sm text-slate-600">
          {already
            ? `You are already in a team (${already.teamName}) for this event.`
            : closed
              ? 'Registration for this event is closed.'
              : 'This event does not need registration.'}
        </p>
        <Link to="/student/events" className="text-sm font-medium text-indigo-600">← Back to events</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-white p-5">
      <div>
        <Link to="/student/events" className="text-xs text-indigo-600">← Events</Link>
        <h1 className="text-xl font-bold">Register: {event.title}</h1>
        <p className="text-xs text-slate-500">
          Last date {fmtDate(event.registrationDeadline)} · Team of {event.minTeamSize}-{event.maxTeamSize} (including you)
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      <input required placeholder="Team name" className={inputCls} value={teamName} onChange={(e) => setTeamName(e.target.value)} />

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <div className="text-xs font-medium text-slate-500">Team leader (you)</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input readOnly className={`${inputCls} bg-slate-100`} value={me?.name || ''} />
          <input readOnly className={`${inputCls} bg-slate-100`} value={me?.rollNumber || ''} />
          <input readOnly className={`${inputCls} bg-slate-100`} value={me?.email || ''} />
          <input required placeholder="Phone" className={inputCls} value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} />
        </div>
      </div>

      {members.map((m, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-500">Member {i + 1}</div>
            {i >= minMembers && (
              <button type="button" onClick={() => setMembers(members.filter((_, idx) => idx !== i))} className="text-xs text-red-600">
                Remove
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input required placeholder="Name" className={inputCls} value={m.name} onChange={(e) => setMember(i, 'name', e.target.value)} />
            <input required placeholder="Roll number" className={inputCls} value={m.rollNumber} onChange={(e) => setMember(i, 'rollNumber', e.target.value)} />
            <input required type="email" placeholder="Email" className={inputCls} value={m.email} onChange={(e) => setMember(i, 'email', e.target.value)} />
            <input required placeholder="Phone" className={inputCls} value={m.phone} onChange={(e) => setMember(i, 'phone', e.target.value)} />
          </div>
        </div>
      ))}

      {members.length < maxMembers && (
        <button type="button" onClick={() => setMembers([...members, { ...blank }])} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
          + Add member
        </button>
      )}

      <button
        disabled={saving}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? 'Registering...' : 'Submit registration'}
      </button>
    </form>
  )
}