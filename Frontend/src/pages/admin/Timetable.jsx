import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import TimetableGrid, { DAYS } from '../../components/common/TimetableGrid'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function Timetable() {
  const { user } = useAuth()
  const canEdit = user.role === 'hod' || user.role === 'admin'
  const isAdmin = user.role === 'admin'

  const [departments, setDepartments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [cls, setCls] = useState({ department: user.branch || '', year: '1', semester: '1', section: 'A' })
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState({
    day: 'Monday',
    session: 'before_lunch',
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    teacherName: '',
    room: '',
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)

  const setC = (e) => setCls({ ...cls, [e.target.name]: e.target.value })
  const setF = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  useEffect(() => {
    if (!isAdmin) return
    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {})
  }, [isAdmin])

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/timetable/class', { params: cls })
      setSlots(data.slots || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the timetable')
    }
  }, [cls])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!canEdit) return
    api
      .get('/timetable/teachers', { params: { department: cls.department } })
      .then(({ data }) => setTeachers(data.teachers || []))
      .catch(() => {})
  }, [canEdit, cls.department])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSaving(true)
    try {
      await api.post('/timetable', { ...cls, ...form })
      setInfo('Class added')
      setForm({ ...form, subject: '', teacherName: '', room: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add the class')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.subject} on ${s.day} ${s.startTime}?`)) return
    try {
      await api.delete(`/timetable/${s._id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-slate-500">
          {canEdit ? 'Pick a class, then add its periods.' : 'Timetable of your department (view only).'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-white p-3 sm:grid-cols-4">
        {isAdmin ? (
          <select name="department" className={inputCls} value={cls.department} onChange={setC}>
            <option value="">Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium">{user.branch}</div>
        )}
        <select name="year" className={inputCls} value={cls.year} onChange={setC}>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
        <select name="semester" className={inputCls} value={cls.semester} onChange={setC}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>
              Sem {s}
            </option>
          ))}
        </select>
        <select name="section" className={inputCls} value={cls.section} onChange={setC}>
          {['A', 'B', 'C', 'D', 'All'].map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All sections' : `Sec ${s}`}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {info && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

      {canEdit && (
        <form onSubmit={add} className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Add a period</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <select name="day" className={inputCls} value={form.day} onChange={setF}>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select name="session" className={inputCls} value={form.session} onChange={setF}>
              <option value="before_lunch">Before lunch</option>
              <option value="after_lunch">After lunch</option>
            </select>
            <input type="time" name="startTime" required className={inputCls} value={form.startTime} onChange={setF} />
            <input type="time" name="endTime" required className={inputCls} value={form.endTime} onChange={setF} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input name="subject" required placeholder="Subject" className={inputCls} value={form.subject} onChange={setF} />
            <input
              name="teacherName"
              list="teacher-names"
              placeholder="Teacher name"
              className={inputCls}
              value={form.teacherName}
              onChange={setF}
            />
            <datalist id="teacher-names">
              {teachers.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input name="room" placeholder="Room (optional)" className={inputCls} value={form.room} onChange={setF} />
          </div>
          <button
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add to timetable'}
          </button>
        </form>
      )}

      <TimetableGrid slots={slots} onDelete={canEdit ? remove : undefined} />
    </div>
  )
}