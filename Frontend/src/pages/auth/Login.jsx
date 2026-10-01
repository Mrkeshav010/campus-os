import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setPending(false)
    setLoading(true)
    try {
      const user = await login(form.identifier.trim(), form.password)
      // NEW: organizer ko apne dashboard par bhejna
      navigate(user.role === 'student' ? '/student' : user.role === 'organizer' ? '/organizer' : '/admin')
    } catch (err) {
      setPending(Boolean(err.response?.data?.pending))
      setError(err.response?.data?.message || 'Login failed. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campus Connect</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        {error && (
          <div
            className={`rounded-lg p-2 text-sm ${
              pending ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {error}
          </div>
        )}

        <input
          required
          placeholder="Email or roll number"
          className={inputCls}
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className={inputCls}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-indigo-600">
            Forgot password?
          </Link>
        </div>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-600">
            Create account
          </Link>
        </p>
      </form>
    </div>
  )
}