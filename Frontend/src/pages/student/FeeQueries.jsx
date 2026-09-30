import { useCallback, useEffect, useState } from 'react'
import ChatThread from '../../components/common/ChatThread'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { createFeeQuery, getMyFeeQueries, replyToFeeQuery } from '../../services/feeQueryService'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function FeeQueries() {
  const socket = useSocket()
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setQueries(await getMyFeeQueries())
    } catch {
      /* keep the old list */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The accounts office replies -> it shows up live
  useEffect(() => {
    if (!socket) return
    socket.on('feeQueryReply', load)
    return () => socket.off('feeQueryReply', load)
  }, [socket, load])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const { query } = await createFeeQuery(form.subject.trim(), form.message.trim())
      setForm({ subject: '', message: '' })
      await load()
      setOpenId(query._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your query')
    } finally {
      setSending(false)
    }
  }

  const reply = async (id, message) => {
    await replyToFeeQuery(id, message)
    await load()
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-bold">Ask the accounts office</h1>
        <p className="text-sm text-slate-500">
          Fee doubts, missing receipts, scholarship or due-date questions. No payment happens here.
        </p>

        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

        <input
          required
          placeholder="Subject (e.g. Receipt not received)"
          className={inputCls}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <textarea
          required
          rows={4}
          placeholder="Explain your question"
          className={inputCls}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <button
          disabled={sending}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Send query'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">My queries</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : queries.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No queries yet.</div>
        ) : (
          <ul className="space-y-3">
            {queries.map((q) => (
              <li key={q._id} className="rounded-xl border bg-white p-4">
                <button
                  onClick={() => setOpenId(openId === q._id ? null : q._id)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div>
                    <div className="font-semibold">{q.subject}</div>
                    <div className="text-xs text-slate-400">
                      {q.messages.length} message{q.messages.length === 1 ? '' : 's'} · updated{' '}
                      {new Date(q.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </div>
                  </div>
                  <StatusBadge value={q.status} />
                </button>

                {openId === q._id && (
                  <div className="mt-3">
                    <ChatThread
                      messages={q.messages}
                      mine="student"
                      accent="indigo"
                      locked={q.status === 'resolved'}
                      onSend={(msg) => reply(q._id, msg)}
                    />
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