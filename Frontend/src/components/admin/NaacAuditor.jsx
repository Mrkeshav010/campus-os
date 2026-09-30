import { useState } from 'react'
import { generateNaacAudit } from '../../services/aiService'
import useOfflineSync from '../../hooks/useOfflineSync'

const CRITERIA = [
  '1. Curricular Aspects',
  '2. Teaching-Learning & Evaluation',
  '3. Research & Extension',
  '4. Infrastructure',
  '5. Student Support',
  '6. Governance',
  '7. Institutional Values',
]

export default function NaacAuditor() {
  const sync = useOfflineSync()
  const [focus, setFocus] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pack, setPack] = useState(null)

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await generateNaacAudit(focus)
      setPack(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate the NAAC pack. Check that the API is running.')
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    if (!pack?.report) return
    const blob = new Blob([pack.report], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `NAAC-IQAC-draft-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const s = pack?.snapshot

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100 bg-amber-950 px-5 py-4 text-amber-50">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Unique IQAC module</div>
          <h2 className="text-lg font-bold">AI Government Auditor · NAAC Compliance Generator</h2>
          <p className="mt-1 max-w-2xl text-xs text-amber-200">
            Pulls live Campus OS metrics (attendance, complaints, leave, certificates, staff) and drafts a 7-criterion
            NAAC self-study pack for IQAC rehearsal — not an official NAAC filing.
          </p>
        </div>
        <div className="rounded-xl border border-amber-700 bg-amber-900/60 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-amber-300">Offline sync switch</div>
              <div className="text-xs text-amber-100">
                {sync.online ? 'Browser online' : 'Browser offline'} · {sync.queued} queued write(s)
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sync.enabled}
              onClick={() => sync.toggle(!sync.enabled)}
              className={`relative h-7 w-12 rounded-full transition ${sync.enabled ? 'bg-amber-400' : 'bg-slate-500'}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
                  sync.enabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          {sync.enabled && (
            <button type="button" onClick={sync.flush} className="mt-2 w-full rounded bg-white/10 py-1 text-xs hover:bg-white/20">
              Flush local queue
            </button>
          )}
        </div>
      </div>

      {sync.toast && <div className="bg-amber-100 px-5 py-2 text-xs text-amber-900">{sync.toast}</div>}

      <div className="grid gap-5 p-5 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {CRITERIA.map((c) => (
              <span key={c} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-amber-900">
                {c}
              </span>
            ))}
          </div>
          <textarea
            rows={3}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Optional IQAC note (e.g. focus Criterion 2 & 5 for tomorrow's mock peer team)"
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {busy ? 'Auditing live data…' : 'Generate NAAC pack'}
            </button>
            {pack?.report && (
              <button type="button" onClick={download} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm">
                Download .md
              </button>
            )}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {s && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Students', s.students],
                ['Staff', s.staff],
                ['Attendance %', s.attendancePercentage ?? '—'],
                ['Complaint close %', s.complaintClosureRate ?? '—'],
                ['Pending leave', s.pendingLeave],
                ['Issued certificates', s.issuedCertificates],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-white px-3 py-2">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="text-lg font-bold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {pack?.source && (
            <div className="text-[11px] text-slate-500">
              Source: {pack.source === 'groq' ? 'Groq narrative on live snapshot' : 'structured snapshot fallback'}
            </div>
          )}
        </div>
        <div className="lg:col-span-3">
          <div className="h-[28rem] overflow-y-auto rounded-xl border bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {pack?.report || 'Run the auditor to see a criterion-wise draft here. Judges can download it as Markdown.'}
          </div>
        </div>
      </div>
    </section>
  )
}
