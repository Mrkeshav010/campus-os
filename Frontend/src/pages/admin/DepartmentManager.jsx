import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

export default function DepartmentManager() {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/departments/manage')
      setDepartments(data.departments)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load departments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/departments', { name })
      setName('')
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add department')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (d) => {
    setError('')
    try {
      await api.patch(`/departments/${d._id}`, { isActive: !d.isActive })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Departments / Courses</h1>
        <p className="text-sm text-slate-500">
          These appear in the signup dropdown. Add your college's courses (MCA, MBA, M.Sc...). A disabled department is
          hidden from new signups but old data stays.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={add} className="flex gap-2">
        <input
          required
          placeholder="New department (e.g. M.Sc)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <ul className="space-y-2">
          {departments.map((d) => (
            <li key={d._id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm">
              <span className={d.isActive ? 'font-medium' : 'text-slate-400 line-through'}>{d.name}</span>
              <button onClick={() => toggle(d)} className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-100">
                {d.isActive ? 'Disable' : 'Enable'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}