import { useEffect, useState } from 'react'
import api from '../../services/api'

const MEALS = [
  ['breakfast', 'Breakfast', '7:30 - 9:00 AM'],
  ['lunch', 'Lunch', '12:30 - 2:00 PM'],
  ['dinner', 'Dinner', '8:00 - 9:30 PM'],
]

const inputCls =
  'w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function MessManager() {
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    api
      .get('/mess')
      .then(({ data }) => {
        setMenu(data.menu || [])
        setUpdatedAt(data.updatedAt)
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the mess menu'))
      .finally(() => setLoading(false))
  }, [])

  const change = (day, meal, field, value) => {
    setInfo('')
    setMenu(menu.map((d) => (d.day === day ? { ...d, [meal]: { ...d[meal], [field]: value } } : d)))
  }

  const copyMonday = () => {
    const monday = menu.find((d) => d.day === 'Monday')
    if (!monday) return
    if (!window.confirm("Copy Monday's menu to all other days?")) return
    setInfo('')
    setMenu(
      menu.map((d) =>
        d.day === 'Monday'
          ? d
          : { ...d, breakfast: { ...monday.breakfast }, lunch: { ...monday.lunch }, dinner: { ...monday.dinner } }
      )
    )
  }

  const save = async () => {
    setError('')
    setInfo('')
    setSaving(true)
    try {
      await api.put('/mess', { menu })
      setInfo('Mess menu saved. Students can see it now.')
      setUpdatedAt(new Date().toISOString())
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the menu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mess menu</h1>
          <p className="text-sm text-slate-500">
            Set breakfast, lunch and dinner for each day. Students can only view it.
            {updatedAt && ` Last saved ${new Date(updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyMonday}
            disabled={loading}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm text-blue-800 hover:bg-blue-50 disabled:opacity-60"
          >
            Copy Monday to all days
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save menu'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {info && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {menu.map((d) => (
            <section key={d.day} className="space-y-3 rounded-xl border border-blue-100 bg-white p-4">
              <h2 className="font-semibold text-blue-700">{d.day}</h2>
              {MEALS.map(([key, label, hint]) => (
                <div key={key} className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      className={`${inputCls} col-span-3`}
                      placeholder="e.g. Poha, Tea, Banana"
                      value={d[key].items}
                      maxLength={300}
                      onChange={(e) => change(d.day, key, 'items', e.target.value)}
                    />
                    <input
                      className={`${inputCls} col-span-2`}
                      placeholder={hint}
                      value={d[key].time}
                      maxLength={40}
                      onChange={(e) => change(d.day, key, 'time', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save menu'}
        </button>
      )}
    </div>
  )
}