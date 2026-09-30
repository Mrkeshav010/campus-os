import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const staffRoles = [
  ['teacher', 'Teacher'],
  ['hod', 'HOD (Head of Department)'],
  ['principal', 'Principal'],
  ['vice_principal', 'Vice Principal'],
  ['accounts', 'Accounts / Fees'],
  ['warden', 'Warden'],
  ['admin', 'Admin (needs setup key)'],
]
const needsDepartment = ['teacher', 'hod']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [isStaff, setIsStaff] = useState(false)
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    rollNumber: '',
    year: '1',
    branch: '',
    section: '',
    hostelBlock: '',
    role: 'teacher',
    adminKey: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingMsg, setPendingMsg] = useState('')

  useEffect(() => {
    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => setError('Could not load departments. Is the server running?'))
  }, [])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { name: form.name, email: form.email, password: form.password }

      if (isStaff) {
        payload.role = form.role
        if (form.phone) payload.phone = form.phone
        if (needsDepartment.includes(form.role)) payload.branch = form.branch
        if (form.role === 'admin') payload.adminKey = form.adminKey
      } else {
        payload.rollNumber = form.rollNumber
        payload.year = Number(form.year)
        payload.branch = form.branch
        payload.section = form.section
        if (form.hostelBlock) payload.hostelBlock = form.hostelBlock
      }

      const result = await register(payload)
      if (result.pending) {
        setPendingMsg(result.message || 'Account created. Wait for admin approval.')
      } else {
        navigate(result.user.role === 'student' ? '/student' : '/admin')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  if (pendingMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 text-center shadow">
          <div className="text-4xl">⏳</div>
          <h1 className="text-xl font-bold text-slate-800">Waiting for approval</h1>
          <p className="text-sm text-slate-600">{pendingMsg}</p>
          <Link to="/login" className="inline-block text-sm font-medium text-indigo-600">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  const deptSelect = (
    <select name="branch" required className={inputCls} value={form.branch} onChange={set}>
      <option value="">Department</option>
      {departments.map((d) => (
        <option key={d._id} value={d.name}>
          {d.name}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create account</h1>
          <p className="text-sm text-slate-500">Campus Connect</p>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

        <input name="name" required placeholder="Full name" className={inputCls} value={form.name} onChange={set} />
        <input name="email" type="email" required placeholder="Email" className={inputCls} value={form.email} onChange={set} />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          className={inputCls}
          value={form.password}
          onChange={set}
        />

        {!isStaff && (
          <>
            <input name="rollNumber" required placeholder="Roll number" className={inputCls} value={form.rollNumber} onChange={set} />
            {deptSelect}
            <div className="grid grid-cols-2 gap-2">
              <select name="year" className={inputCls} value={form.year} onChange={set}>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <input name="section" required placeholder="Section (A)" className={inputCls} value={form.section} onChange={set} />
            </div>
            <input name="hostelBlock" placeholder="Hostel block (optional)" className={inputCls} value={form.hostelBlock} onChange={set} />
          </>
        )}

        {isStaff && (
          <>
            <select name="role" className={inputCls} value={form.role} onChange={set}>
              {staffRoles.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {needsDepartment.includes(form.role) && deptSelect}
            <input name="phone" placeholder="Phone (optional)" className={inputCls} value={form.phone} onChange={set} />
            {form.role === 'admin' ? (
              <>
                <input name="adminKey" required placeholder="Admin setup key" className={inputCls} value={form.adminKey} onChange={set} />
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                  Use a real email you can open. Forgot-password OTP is sent there.
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                Staff accounts can log in only after the admin approves them.
              </p>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
          I am staff (teacher / HOD / principal / accounts...)
        </label>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}