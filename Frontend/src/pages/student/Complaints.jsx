import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { createComplaint, getMyComplaints } from '../../services/complaintService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const categories = ['electricity', 'water', 'food', 'cleanliness', 'internet', 'other']
const empty = { category: 'electricity', location: '', description: '' }

export default function Complaints() {
  const socket = useSocket()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await getMyComplaints())
    } catch {
      /* keep the old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Admin changes the status -> it updates here live
  useEffect(() => {
    if (!socket) return
    socket.on('complaintStatusUpdate', load)
    return () => socket.off('complaintStatusUpdate', load)
  }, [socket, load])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSending(true)
    try {
      const { complaint } = await createComplaint({
        category: form.category,
        location: form.location.trim(),
        description: form.description.trim(),
      })
      setInfo(
        `Submitted. Our AI marked it ${complaint.priority} priority${
          complaint.isRecurring ? ' and flagged it as a recurring problem at this location' : ''
        }.`
      )
      setForm(empty)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the complaint')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Raise a complaint</h1>
        <p className="text-sm text-slate-500">Hostel, mess or campus issues. Urgent ones are sorted to the top automatically.</p>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {info && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

        <select name="category" className={`${inputCls} capitalize`} value={form.category} onChange={set}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          name="location"
          required
          placeholder="Location (e.g. Hostel Block A, Room 12)"
          className={inputCls}
          value={form.location}
          onChange={set}
        />
        <textarea
          name="description"
          required
          rows={4}
          placeholder="What is the problem?"
          className={inputCls}
          value={form.description}
          onChange={set}
        />
        <button
          disabled={sending}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {sending ? 'Submitting...' : 'Submit complaint'}
        </button>
        <p className="text-xs text-slate-400">
          Write the location the same way every time. Repeated complaints from one place are detected as a recurring issue.
        </p>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">My complaints</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No complaints yet.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li key={c._id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold capitalize">{c.category}</div>
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
                <div className="mt-1 text-xs text-slate-500">
                  {c.location} · {new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
                <div className="mt-2 text-sm">{c.description}</div>
                {c.resolvedAt && (
                  <div className="mt-2 text-xs text-emerald-700">
                    Resolved on {new Date(c.resolvedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
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