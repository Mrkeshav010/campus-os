import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const btnCls =
  'w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'

export default function ForgotPassword() {
  const [step, setStep] = useState('request') // request -> reset -> done
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { identifier: identifier.trim() })
      setInfo(data.message)
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword: password,
      })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Forgot password</h1>
          <p className="text-sm text-slate-500">We will email you a 6-digit OTP</p>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {info && step === 'reset' && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

        {step === 'request' && (
          <form onSubmit={sendOtp} className="space-y-3">
            <input
              required
              placeholder="Email or roll number"
              className={inputCls}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <button disabled={loading} className={btnCls}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={resetPassword} className="space-y-3">
            <input
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              className={inputCls}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password (min 6 characters)"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button disabled={loading} className={btnCls}>
              {loading ? 'Saving...' : 'Change password'}
            </button>
            <button type="button" disabled={loading} onClick={sendOtp} className="w-full text-sm text-indigo-600">
              Did not get it? Send OTP again (after 1 minute)
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-sm text-slate-600">Password changed. You can sign in with the new password now.</p>
            <Link to="/login" className="inline-block text-sm font-medium text-indigo-600">
              Go to sign in
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-indigo-600">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}