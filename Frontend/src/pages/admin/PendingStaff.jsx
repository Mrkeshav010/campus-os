import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

const roleLabel = {
  teacher: 'Teacher',
  hod: 'HOD',
  principal: 'Principal',
  vice_principal: 'Vice Principal',
  accounts: 'Accounts / Fees',
  warden: 'Warden',
}

export default function PendingStaff() {
  const [staff, setStaff] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/staff/pending')
      setStaff(data.staff)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load pending accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (id, action) => {
    setBusy(id)
    setError('')
    try {
      await api.patch(`/admin/staff/${id}/${action}`, { note: (notes[id] || '').trim() })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pending staff accounts</h1>
        <p className="text-sm text-slate-500">
          {staff.length} waiting. Check that you know the person before approving: approved staff get access to college data.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No pending accounts.</div>
      ) : (
        <ul className="space-y-3">
          {staff.map((s) => (
            <li key={s._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.email}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{roleLabel[s.role] || s.role}</div>
                  {s.branch && <div className="text-xs text-slate-500">Dept: {s.branch}</div>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  placeholder="Reason if rejecting (optional)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={notes[s._id] || ''}
                  onChange={(e) => setNotes({ ...notes, [s._id]: e.target.value })}
                />
                <button
                  disabled={busy === s._id}
                  onClick={() => decide(s._id, 'approve')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busy === s._id}
                  onClick={() => decide(s._id, 'reject')}
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