import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { getMyCertificates, requestCertificate } from '../../services/certificateService'
import { SERVER_URL } from '../../utils/serverUrl'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const types = [
  ['bonafide', 'Bonafide certificate'],
  ['no-dues', 'No-dues certificate'],
  ['character', 'Character certificate'],
  ['migration', 'Migration certificate'],
]
const typeLabel = Object.fromEntries(types)
const empty = { type: 'bonafide', reason: '' }

export default function Certificates() {
  const socket = useSocket()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setCerts(await getMyCertificates())
    } catch {
      /* keep the old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('certificateApproved', load)
    socket.on('certificateRejected', load)
    return () => {
      socket.off('certificateApproved', load)
      socket.off('certificateRejected', load)
    }
  }, [socket, load])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await requestCertificate({ type: form.type, reason: form.reason.trim() })
      setForm(empty)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the request')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Request a certificate</h1>
        <p className="text-sm text-slate-500">
          Once approved you can download a PDF with a QR code. Anyone can scan it to verify it is genuine.
        </p>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

        <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {types.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <textarea
          rows={3}
          placeholder="Purpose (e.g. bank account, scholarship, passport)"
          className={inputCls}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <button
          disabled={sending}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Send request'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">My certificates</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : certs.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No requests yet.</div>
        ) : (
          <ul className="space-y-3">
            {certs.map((c) => (
              <li key={c._id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{typeLabel[c.type] || c.type}</div>
                  <StatusBadge value={c.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Requested {new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  {c.reason ? ` · ${c.reason}` : ''}
                </div>

                {c.status === 'approved' && c.pdfUrl && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <a
                      href={`${SERVER_URL}${c.pdfUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
                    >
                      Download PDF
                    </a>
                    <Link to={`/verify/${c.certificateId}`} className="text-indigo-600 underline">
                      Verification page
                    </Link>
                    <span className="text-xs text-slate-400">{c.certificateId}</span>
                  </div>
                )}

                {c.status === 'rejected' && (
                  <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600">
                    {c.rejectionNote || 'This request was rejected.'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}