import { useCallback, useEffect, useState } from 'react'
import ChatThread from '../../components/common/ChatThread'
import StatusBadge from '../../components/common/StatusBadge'
import { useSocket } from '../../context/SocketContext'
import { getAllFeeQueries, replyToFeeQuery, resolveFeeQuery } from '../../services/feeQueryService'

const tabs = [
  ['open', 'Open'],
  ['resolved', 'Resolved'],
  ['all', 'All'],
]

export default function FeeManager() {
  const socket = useSocket()
  const [queries, setQueries] = useState([])
  const [tab, setTab] = useState('open')
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setQueries(await getAllFeeQueries())
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load queries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    socket.on('newFeeQuery', load)
    socket.on('feeQueryReply', load)
    return () => {
      socket.off('newFeeQuery', load)
      socket.off('feeQueryReply', load)
    }
  }, [socket, load])

  const reply = async (id, message) => {
    await replyToFeeQuery(id, message)
    await load()
  }

  const resolve = async (id) => {
    setError('')
    try {
      await resolveFeeQuery(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resolve the query')
    }
  }

  const shown = queries.filter((q) => (tab === 'all' ? true : q.status === tab))

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Fee queries</h1>
        <p className="text-sm text-slate-500">Reply to students. They are alerted live. This is support only, no payments.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        {tabs.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === v ? 'bg-emerald-600 text-white' : 'border bg-white hover:bg-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No queries here.</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((q) => (
            <li key={q._id} className="rounded-xl border bg-white p-4">
              <button
                onClick={() => setOpenId(openId === q._id ? null : q._id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div>
                  <div className="font-semibold">{q.subject}</div>
                  <div className="text-xs text-slate-500">
                    {q.student?.name} · {q.student?.rollNumber} · {q.messages.length} message
                    {q.messages.length === 1 ? '' : 's'}
                  </div>
                </div>
                <StatusBadge value={q.status} />
              </button>

              {openId === q._id && (
                <div className="mt-3 space-y-3">
                  <ChatThread
                    messages={q.messages}
                    mine="admin"
                    accent="emerald"
                    onSend={(msg) => reply(q._id, msg)}
                  />
                  {q.status !== 'resolved' && (
                    <button
                      onClick={() => resolve(q._id)}
                      className="rounded-lg border border-emerald-600 px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}