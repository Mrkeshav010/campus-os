import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { deleteMaterial, getMyUploads, uploadMaterial } from '../../services/materialService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function UploadMaterial() {
  const { user } = useAuth()
  const blank = {
    title: '',
    description: '',
    type: 'notes',
    department: user.branch || '',
    subject: '',
    year: '1',
    semester: '1',
    section: 'A',
  }
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState(null)
  const [fileKey, setFileKey] = useState(0)
  const [departments, setDepartments] = useState([])
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setList(await getMyUploads())
    } catch {
      /* keep old list */
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {})
  }, [load])

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!file) return setError('Please choose a file')
    setSending(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('file', file)
      const data = await uploadMaterial(fd)
      setInfo(data.message)
      setForm({ ...blank, department: form.department, subject: form.subject })
      setFile(null)
      setFileKey((k) => k + 1)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setSending(false)
    }
  }

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    try {
      await deleteMaterial(m._id)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Upload study material</h1>
        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {info && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}

        <input name="title" required placeholder="Title" className={inputCls} value={form.title} onChange={set} />
        <textarea name="description" rows={2} placeholder="Note (optional)" className={inputCls} value={form.description} onChange={set} />

        <select name="type" className={inputCls} value={form.type} onChange={set}>
          <option value="notes">Notes</option>
          <option value="assignment">Assignment</option>
          <option value="other">Other</option>
        </select>

        <select name="department" required className={inputCls} value={form.department} onChange={set}>
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d._id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        <input name="subject" required placeholder="Subject" className={inputCls} value={form.subject} onChange={set} />

        <div className="grid grid-cols-3 gap-2">
          <select name="year" className={inputCls} value={form.year} onChange={set}>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
          <select name="semester" className={inputCls} value={form.semester} onChange={set}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
          <select name="section" className={inputCls} value={form.section} onChange={set}>
            {['A', 'B', 'C', 'D', 'All'].map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All sections' : `Sec ${s}`}
              </option>
            ))}
          </select>
        </div>

        <input
          key={fileKey}
          type="file"
          onChange={(e) => setFile(e.target.files[0] || null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700"
        />
        <p className="text-xs text-slate-400">PDF, Word, PPT, Excel, image, zip. Max 10 MB.</p>

        <button
          disabled={sending}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {sending ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">My uploads</h2>
        {list.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Nothing uploaded yet.</div>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m._id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  <span className="text-xs capitalize text-slate-400">{m.type}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {m.department} · {m.subject} · Year {m.year} · Sem {m.semester} · {m.section === 'All' ? 'All sections' : `Sec ${m.section}`}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <a href={m.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-50">
                    Open
                  </a>
                  <button onClick={() => remove(m)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}