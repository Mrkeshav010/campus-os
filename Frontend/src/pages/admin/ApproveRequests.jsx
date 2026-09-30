import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { getHistory, getPending, reviewLeave } from '../../services/leaveService'

const fmt = (d, type) =>
  type === 'gatepass'
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })

export default function ApproveRequests() {
  const socket = useSocket()
  const [pending, setPending] = useState([])
  const [history, setHistory] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getPending(), getHistory()])
      setPending(p)
      setHistory(h)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // A new request from any student appears here instantly
  useEffect(() => {
    if (!socket) return
    socket.on('newLeaveRequest', load)
    return () => socket.off('newLeaveRequest', load)
  }, [socket, load])

  const decide = async (id, status) => {
    setBusy(id)
    setError('')
    try {
      await reviewLeave(id, status, (notes[id] || '').trim())
      setNotes((n) => ({ ...n, [id]: '' }))
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the decision')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave & gate-pass requests</h1>
        <p className="text-sm text-slate-500">
          {pending.length} waiting for a decision. New requests appear here live. Urgent ones are on top.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          Nothing pending. All caught up.
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((l) => (
            <li
              key={l._id}
              className={`rounded-xl border bg-white p-4 ${l.priority === 'urgent' ? 'border-red-300' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{l.student?.name}</div>
                  <div className="text-xs text-slate-500">
                    {l.student?.rollNumber} · {l.student?.branch} · Year {l.student?.year} · Sec {l.student?.section}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">{l.type}</span>
                  <StatusBadge value={l.priority} />
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {fmt(l.fromDate, l.type)} → {fmt(l.toDate, l.type)}
              </div>
              <div className="mt-1 text-sm">{l.reason}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  placeholder="Note for the student (optional)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={notes[l._id] || ''}
                  onChange={(e) => setNotes({ ...notes, [l._id]: e.target.value })}
                />
                <button
                  disabled={busy === l._id}
                  onClick={() => decide(l._id, 'approved')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busy === l._id}
                  onClick={() => decide(l._id, 'rejected')}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Recent decisions</h2>
        {history.length === 0 ? (
          <div className="text-sm text-slate-400">No decisions yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((l) => (
              <li key={l._id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                <div>
                  <span className="font-medium">{l.student?.name}</span>
                  <span className="text-slate-500"> · {l.type}</span>
                  {l.reviewedBy?.name && <span className="text-xs text-slate-400"> · by {l.reviewedBy.name}</span>}
                </div>
                <StatusBadge value={l.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}