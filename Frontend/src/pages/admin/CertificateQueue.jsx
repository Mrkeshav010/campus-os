import { useCallback, useEffect, useState } from 'react'
import { useSocket } from '../../context/SocketContext'
import {
  approveCertificate,
  getPendingCertificates,
  rejectCertificate,
} from '../../services/certificateService'
import { SERVER_URL } from '../../utils/serverUrl'

const typeLabel = {
  bonafide: 'Bonafide certificate',
  'no-dues': 'No-dues certificate',
  character: 'Character certificate',
  migration: 'Migration certificate',
}

export default function CertificateQueue() {
  const socket = useSocket()
  const [pending, setPending] = useState([])
  const [issued, setIssued] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setPending(await getPendingCertificates())
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('newCertificateRequest', load)
    return () => socket.off('newCertificateRequest', load)
  }, [socket, load])

  const approve = async (c) => {
    setBusy(c._id)
    setError('')
    try {
      const { cert } = await approveCertificate(c._id)
      setIssued((list) => [{ ...cert, studentName: c.student?.name }, ...list])
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve')
    } finally {
      setBusy('')
    }
  }

  const reject = async (c) => {
    setBusy(c._id)
    setError('')
    try {
      await rejectCertificate(c._id, (notes[c._id] || '').trim())
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Certificate queue</h1>
        <p className="text-sm text-slate-500">
          Approving generates a PDF with a unique ID and a verification QR. {pending.length} waiting.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {issued.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-emerald-800">Issued just now</h2>
          <ul className="space-y-1 text-sm">
            {issued.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {c.studentName} · {typeLabel[c.type] || c.type} · {c.certificateId}
                </span>
                <a
                  href={`${SERVER_URL}${c.pdfUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline"
                >
                  Open PDF
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No pending requests.</div>
      ) : (
        <ul className="space-y-3">
          {pending.map((c) => (
            <li key={c._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.student?.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.student?.rollNumber} · {c.student?.branch} · Year {c.student?.year}
                  </div>
                </div>
                <span className="text-sm font-medium">{typeLabel[c.type] || c.type}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">{c.reason || 'No purpose given'}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  placeholder="Reason if rejecting (optional)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={notes[c._id] || ''}
                  onChange={(e) => setNotes({ ...notes, [c._id]: e.target.value })}
                />
                <button
                  disabled={busy === c._id}
                  onClick={() => approve(c)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy === c._id ? 'Working...' : 'Approve & issue'}
                </button>
                <button
                  disabled={busy === c._id}
                  onClick={() => reject(c)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}