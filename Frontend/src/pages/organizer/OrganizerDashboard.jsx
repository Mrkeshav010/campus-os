import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyEvents, removeEvent, fmtDate, typeColors } from '../../services/eventService'

export default function OrganizerDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      setEvents(await getMyEvents())
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.title}" and all its registrations? This cannot be undone.`)) return
    setBusy(e._id)
    setError('')
    try {
      await removeEvent(e._id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">My events</h1>
          <p className="text-sm text-slate-500">Events and notices you posted.</p>
        </div>
        <Link
          to="/organizer/events/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Post event
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          You have not posted anything yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{e.title}</h2>
                  <div className="text-xs text-slate-500">
                    {fmtDate(e.date)}
                    {e.time ? ` · ${e.time}` : ''} · {e.venue}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${typeColors[e.type]}`}>{e.type}</span>
              </div>

              {e.registrationRequired ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Teams: {e.counts.total}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Pending: {e.counts.pending}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Approved: {e.counts.approved}</span>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Rejected: {e.counts.rejected}</span>
                  <span className="px-1 py-1 text-slate-400">Last date: {fmtDate(e.registrationDeadline)}</span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-400">No registration for this one.</div>
              )}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {e.registrationRequired && (
                  <Link
                    to={`/organizer/events/${e._id}/registrations`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Registrations
                  </Link>
                )}
                <Link
                  to={`/organizer/events/${e._id}/edit`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() => remove(e)}
                  disabled={busy === e._id}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {busy === e._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}