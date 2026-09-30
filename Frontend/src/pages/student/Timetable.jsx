import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import TimetableGrid from '../../components/common/TimetableGrid'

export default function StudentTimetable() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [semester, setSemester] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/timetable/my')
      .then(({ data }) => {
        setSlots(data.slots || [])
        setSemester(data.semester)
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the timetable'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-slate-500">
          {user.branch} · Year {user.year} · Section {user.section}
          {semester ? ` · Sem ${semester}` : ''}
        </p>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          Your HOD has not published the timetable yet.
        </div>
      ) : (
        <TimetableGrid slots={slots} />
      )}
    </div>
  )
}