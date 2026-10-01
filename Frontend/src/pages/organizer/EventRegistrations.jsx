import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  downloadCsv,
  fmtDate,
  getRegistrations,
  reviewRegistration,
  statusColors,
} from '../../services/eventService'

export default function EventRegistrations() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [remarks, setRemarks] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await getRegistrations(id)
      setData(d)
      setRemarks((prev) => {
        const next = { ...prev }
        d.registrations.forEach((r) => {
          if (next[r._id] === undefined) next[r._id] = r.remark || ''
        })
        return next
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load registrations')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (reg, status) => {
    setBusy(reg._id)
    setError('')
    try {
      await reviewRegistration(reg._id, status, remarks[reg._id] || '')
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  const csv = async () => {
    try {
      await downloadCsv(id, data.event.title)
    } catch {
      setError('Could not download the CSV')
    }
  }

  if (!data) return <div className="text-sm text-slate-500">{error || 'Loading...'}</div>

  const { event, registrations, counts } = data
  const shown = filter === 'all' ? registrations : registrations.filter((r) => r.status === filter)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link to="/organizer" className="text-xs text-indigo-600">← My events</Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-xs text-slate-500">
              {fmtDate(event.date)} · Last date {fmtDate(event.registrationDeadline)} · Team size {event.minTeamSize}-{event.maxTeamSize}
            </p>
          </div>
          <button onClick={csv} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50">
            ⬇ Download CSV
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {[
          ['all', `All (${counts.total})`],
          ['pending', `Pending (${counts.pending})`],
          ['approved', `Approved (${counts.approved})`],
          ['rejected', `Rejected (${counts.rejected})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No teams here.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{r.teamName}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${statusColors[r.status]}`}>{r.status}</span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pr-3">Role</th>
                      <th className="pr-3">Name</th>
                      <th className="pr-3">Roll no</th>
                      <th className="pr-3">Email</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-medium">
                      <td className="pr-3">Leader</td>
                      <td className="pr-3">{r.leader.name}</td>
                      <td className="pr-3">{r.leader.rollNumber}</td>
                      <td className="pr-3">{r.leader.email}</td>
                      <td>{r.leader.phone}</td>
                    </tr>
                    {r.members.map((m, i) => (
                      <tr key={i}>
                        <td className="pr-3">Member {i + 1}</td>
                        <td className="pr-3">{m.name}</td>
                        <td className="pr-3">{m.rollNumber}</td>
                        <td className="pr-3">{m.email}</td>
                        <td>{m.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  placeholder="Remark (shown to the student)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={remarks[r._id] ?? ''}
                  onChange={(e) => setRemarks({ ...remarks, [r._id]: e.target.value })}
                />
                <button
                  disabled={busy === r._id}
                  onClick={() => decide(r, 'approved')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busy === r._id}
                  onClick={() => decide(r, 'rejected')}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}