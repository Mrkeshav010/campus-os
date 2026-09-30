import { useEffect, useState } from 'react'
import api from '../../services/api'

const MEALS = [
  ['breakfast', 'Breakfast', '🍳'],
  ['lunch', 'Lunch', '🍛'],
  ['dinner', 'Dinner', '🍽️'],
]

const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' })

function Meals({ day, light }) {
  return (
    <div className="space-y-2">
      {MEALS.map(([key, label, icon]) => (
        <div key={key} className={`rounded-lg px-3 py-2 ${light ? 'bg-white/15' : 'bg-sky-50'}`}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={`font-medium uppercase tracking-wide ${light ? 'text-blue-100' : 'text-slate-500'}`}>
              {icon} {label}
            </span>
            {day[key].time && <span className={light ? 'text-blue-100' : 'text-slate-400'}>{day[key].time}</span>}
          </div>
          <div className={`mt-0.5 text-sm ${light ? 'text-white' : 'text-slate-800'}`}>
            {day[key].items || <span className={light ? 'text-blue-200' : 'text-slate-400'}>Not updated yet</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Mess() {
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const today = todayName()

  useEffect(() => {
    api
      .get('/mess')
      .then(({ data }) => setMenu(data.menu || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load the mess menu'))
      .finally(() => setLoading(false))
  }, [])

  const todayMenu = menu.find((d) => d.day === today)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Mess menu</h1>
        <p className="text-sm text-slate-500">This week's breakfast, lunch and dinner. Updated by the warden.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-slate-500">Loading...</div>}

      {todayMenu && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-sky-500 p-5 text-white shadow-sm">
          <div className="text-xs uppercase tracking-widest text-blue-100">Today</div>
          <h2 className="mb-3 text-xl font-bold">{todayMenu.day}</h2>
          <Meals day={todayMenu} light />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((d) => (
          <section
            key={d.day}
            className={`space-y-3 rounded-xl border bg-white p-4 ${
              d.day === today ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-blue-700">{d.day}</h2>
              {d.day === today && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Today</span>
              )}
            </div>
            <Meals day={d} />
          </section>
        ))}
      </div>
    </div>
  )
}