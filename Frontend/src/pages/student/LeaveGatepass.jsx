import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { createLeave, getMyLeaves } from '../../services/leaveService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

// "2026-10-01" -> start/end of that day; "2026-10-01T18:30" -> that exact moment
const toISO = (v, endOfDay) =>
  new Date(v.length === 10 ? `${v}T${endOfDay ? '23:59' : '00:00'}` : v).toISOString()

const fmt = (d, type) =>
  type === 'gatepass'
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })

const empty = { type: 'leave', reason: '', fromDate: '', toDate: '', priority: 'normal' }

export default function LeaveGatepass() {
  const socket = useSocket()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setLeaves(await getMyLeaves())
    } catch {
      /* keep the old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The admin's decision shows up here live
  useEffect(() => {
    if (!socket) return
    socket.on('leaveStatusUpdate', load)
    return () => socket.off('leaveStatusUpdate', load)
  }, [socket, load])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const setType = (type) => setForm({ ...form, type, fromDate: '', toDate: '' })
  const isGate = form.type === 'gatepass'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.toDate < form.fromDate) {
      setError('End cannot be before start')
      return
    }
    setSending(true)
    try {
      await createLeave({
        type: form.type,
        reason: form.reason.trim(),
        fromDate: toISO(form.fromDate, false),
        toDate: toISO(form.toDate, true),
        priority: form.priority,
      })
      setForm(empty)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the request')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">New request</h1>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm">
          {[
            ['leave', 'Leave'],
            ['gatepass', 'Gate-pass'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setType(value)}
              className={`rounded-md py-1.5 font-medium ${
                form.type === value ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

        <label className="block text-xs text-slate-500">
          {isGate ? 'Going out at' : 'From'}
          <input
            type={isGate ? 'datetime-local' : 'date'}
            name="fromDate"
            required
            className={`${inputCls} mt-1`}
            value={form.fromDate}
            onChange={set}
          />
        </label>
        <label className="block text-xs text-slate-500">
          {isGate ? 'Coming back by' : 'To'}
          <input
            type={isGate ? 'datetime-local' : 'date'}
            name="toDate"
            required
            className={`${inputCls} mt-1`}
            value={form.toDate}
            onChange={set}
          />
        </label>

        <textarea
          name="reason"
          required
          rows={3}
          placeholder="Reason"
          className={inputCls}
          value={form.reason}
          onChange={set}
        />

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.priority === 'urgent'}
            onChange={(e) => setForm({ ...form, priority: e.target.checked ? 'urgent' : 'normal' })}
          />
          Urgent / emergency (admin is alerted by push and email)
        </label>

        <button
          disabled={sending}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Submit request'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">My requests</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
            No requests yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => (
              <li key={l._id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{l.type}</span>
                    {l.priority === 'urgent' && <StatusBadge value="urgent" />}
                  </div>
                  <StatusBadge value={l.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {fmt(l.fromDate, l.type)} → {fmt(l.toDate, l.type)}
                </div>
                <div className="mt-2 text-sm">{l.reason}</div>
                {l.reviewNote && (
                  <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Note: {l.reviewNote}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}