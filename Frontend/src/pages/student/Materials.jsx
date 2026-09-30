import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSocket } from '../../context/SocketContext'
import { getStudentMaterials } from '../../services/materialService'

export default function Materials() {
  const socket = useSocket()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')

  const load = useCallback(async () => {
    try {
      setItems(await getStudentMaterials())
    } catch {
      /* keep old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('newMaterial', load)
    return () => socket.off('newMaterial', load)
  }, [socket, load])

  const subjects = useMemo(() => [...new Set(items.map((m) => m.subject))], [items])
  const shown = subject ? items.filter((m) => m.subject === subject) : items

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Class Updates</h1>
        <p className="text-sm text-slate-500">Notes and assignments uploaded for your department, year and section.</p>
      </div>

      {subjects.length > 1 && (
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Nothing uploaded for you yet.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{m.title}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                    m.type === 'assignment' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {m.type}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {m.subject} · Sem {m.semester}
                {m.uploadedBy?.name ? ` · ${m.uploadedBy.name}` : ''} · {new Date(m.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </div>
              {m.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.description}</p>}
              <div className="mt-3 text-right">
                <a
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}