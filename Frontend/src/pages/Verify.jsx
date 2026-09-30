import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { verifyCertificate } from '../services/certificateService'

const label = {
  bonafide: 'Bonafide certificate',
  'no-dues': 'No-dues certificate',
  character: 'Character certificate',
  migration: 'Migration certificate',
}

// Public page: anyone who scans the QR on a certificate lands here. No login needed.
export default function Verify() {
  const { certificateId } = useParams()
  const [state, setState] = useState({ loading: true, data: null })

  useEffect(() => {
    let alive = true
    verifyCertificate(certificateId)
      .then((data) => alive && setState({ loading: false, data }))
      .catch((err) =>
        alive &&
        setState({
          loading: false,
          data: err.response?.data || { valid: false, message: 'Could not reach the server' },
        })
      )
    return () => {
      alive = false
    }
  }, [certificateId])

  const { loading, data } = state

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <div className="text-xs uppercase tracking-widest text-slate-400">Certificate verification</div>
        <div className="mt-1 break-all text-sm text-slate-500">{certificateId}</div>

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Checking...</div>
        ) : data?.valid ? (
          <div className="mt-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-center text-lg font-bold text-emerald-700">
              ✓ Genuine certificate
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Issued by', data.college],
                ['Student', data.student],
                ['Roll number', data.rollNumber],
                ['Branch', data.branch],
                ['Type', label[data.type] || data.type],
                ['Issued on', new Date(data.issuedOn).toLocaleDateString('en-IN', { dateStyle: 'long' })],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-1">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-red-600">
            <div className="text-lg font-bold">✗ Not verified</div>
            <div className="mt-1 text-sm">{data?.message || 'This certificate could not be verified.'}</div>
          </div>
        )}

        <Link to="/login" className="mt-6 block text-center text-xs text-slate-400">
          Campus Connect
        </Link>
      </div>
    </div>
  )
}