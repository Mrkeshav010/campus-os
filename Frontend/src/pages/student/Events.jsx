import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { fmtDate, getEvents, statusColors, typeColors } from '../../services/eventService'

export default function Events() {
  const { user } = useAuth()
  const socket = useSocket()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      setEvents(await getEvents())
    } catch {
      /* keep the old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('newEvent', load)
    socket.on('registrationStatus', load)
    return () => {
      socket.off('newEvent', load)
      socket.off('registrationStatus', load)
    }
  }, [socket, load])

  const shown = typeFilter === 'all' ? events : events.filter((e) => e.type === typeFilter)
  const isStudent = user.role === 'student'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-slate-500">Hackathons, functions, workshops, seminars and notices for you.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'hackathon', 'function', 'workshop', 'seminar', 'notice'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${typeFilter === t ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No events yet.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((e) => {
            const closed = e.registrationDeadline && new Date(e.registrationDeadline) < new Date()
            const reg = e.myRegistration
            const isPdf = /\.pdf$/i.test(e.posterUrl || '')
            return (
              <li key={e._id} className="overflow-hidden rounded-xl border bg-white">
                {e.posterUrl && !isPdf && <img src={e.posterUrl} alt={e.title} className="max-h-72 w-full object-cover" />}
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-semibold">{e.title}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${typeColors[e.type]}`}>{e.type}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    📅 {fmtDate(e.date)}
                    {e.time ? ` · ${e.time}` : ''} · 📍 {e.venue}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{e.details}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {e.posterUrl && isPdf && (
                      <a href={e.posterUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 font-medium hover:bg-slate-50">
                        📄 Brochure
                      </a>
                    )}
                    {e.externalLink && (
                      <a href={e.externalLink} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 font-medium hover:bg-slate-50">
                        🔗 Open link
                      </a>
                    )}
                    {e.registrationRequired && (
                      <span className="text-slate-400">
                        Last date: {fmtDate(e.registrationDeadline)} · Team {e.minTeamSize}-{e.maxTeamSize}
                      </span>
                    )}
                  </div>

                  {isStudent && e.registrationRequired && (
                    <div className="mt-3">
                      {reg ? (
                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${statusColors[reg.status]}`}>{reg.status}</span>{' '}
                          Team <b>{reg.teamName}</b>
                          {reg.remark && <div className="mt-1 text-xs text-slate-500">Remark: {reg.remark}</div>}
                        </div>
                      ) : closed ? (
                        <div className="text-sm font-medium text-red-600">Registration closed</div>
                      ) : (
                        <Link
                          to={`/student/events/${e._id}/register`}
                          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Register
                        </Link>
                      )}
                    </div>
                  )}

                  {e.postedBy?.name && (
                    <div className="mt-2 text-xs text-slate-400">
                      Posted by {e.postedBy.name}
                      {e.postedBy.designation ? ` (${e.postedBy.designation})` : ''}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}