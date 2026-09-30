import { useCallback, useEffect, useState } from 'react'
import { useSocket } from '../../context/SocketContext'
import { getMyNotices } from '../../services/noticeService'

export default function Notices() {
  const socket = useSocket()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setNotices(await getMyNotices())
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
    socket.on('newNotice', load)
    return () => socket.off('newNotice', load)
  }, [socket, load])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Notices</h1>
        <p className="text-sm text-slate-500">Only announcements meant for your year, branch and hostel show up here.</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : notices.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No notices for you yet.</div>
      ) : (
        <ul className="space-y-3">
          {notices.map((n) => (
            <li key={n._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{n.title}</h2>
                <span className="text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}