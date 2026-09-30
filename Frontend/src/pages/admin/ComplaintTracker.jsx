import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import {
  getAllComplaints,
  getComplaintAnalytics,
  updateComplaintStatus,
} from '../../services/complaintService'

const tabs = [
  ['active', 'Active'],
  ['resolved', 'Resolved'],
  ['all', 'All'],
]

export default function ComplaintTracker() {
  const socket = useSocket()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('active')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([getAllComplaints(), getComplaintAnalytics()])
      setComplaints(c)
      setStats(a)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load complaints')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('newComplaint', load)
    return () => socket.off('newComplaint', load)
  }, [socket, load])

  const setStatus = async (id, status) => {
    setBusy(id)
    setError('')
    try {
      await updateComplaintStatus(id, status)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the status')
    } finally {
      setBusy('')
    }
  }

  const shown = complaints.filter((c) =>
    tab === 'all' ? true : tab === 'resolved' ? c.status === 'resolved' : c.status !== 'resolved'
  )
  const heat = stats?.heatmap || []
  const maxHeat = heat[0]?.count || 1

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Complaint tracker</h1>
        <p className="text-sm text-slate-500">High-priority complaints come first. New ones appear live.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Open complaints</div>
          <div className="mt-1 text-3xl font-bold">{stats ? stats.pendingCount : '—'}</div>
        </div>
        <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Avg resolution (hrs)</div>
          <div className="mt-1 text-3xl font-bold">{stats ? Number(stats.avgResolutionHours) : '—'}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 sm:col-span-1">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Hotspots</div>
          {heat.length === 0 ? (
            <div className="text-sm text-slate-400">No data yet.</div>
          ) : (
            <ul className="space-y-2 text-xs">
              {heat.slice(0, 4).map((h) => (
                <li key={h._id}>
                  <div className="flex justify-between">
                    <span className="truncate pr-2">{h._id}</span>
                    <span className="font-medium">{h.count}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${(h.count / maxHeat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === v ? 'bg-emerald-600 text-white' : 'border bg-white hover:bg-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Nothing here.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => (
            <li
              key={c._id}
              className={`rounded-xl border bg-white p-4 ${
                c.priority === 'high' && c.status !== 'resolved' ? 'border-red-300' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold capitalize">
                    {c.category} · {c.location}
                  </div>
                  <div className="text-xs text-slate-500">
                    {c.student?.name} · {c.student?.rollNumber}
                    {c.student?.hostelBlock ? ` · ${c.student.hostelBlock}` : ''} ·{' '}
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.isRecurring && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Recurring
                    </span>
                  )}
                  <StatusBadge value={c.priority} />
                  <StatusBadge value={c.status} />
                </div>
              </div>

              <div className="mt-2 text-sm">{c.description}</div>

              {c.status !== 'resolved' && (
                <div className="mt-3 flex gap-2">
                  {c.status === 'open' && (
                    <button
                      disabled={busy === c._id}
                      onClick={() => setStatus(c._id, 'in-progress')}
                      className="rounded-lg border px-4 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      Start work
                    </button>
                  )}
                  <button
                    disabled={busy === c._id}
                    onClick={() => setStatus(c._id, 'resolved')}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}