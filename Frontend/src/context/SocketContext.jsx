import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

// Live event -> toast text
const messages = {
  newLeaveRequest: (d) => `New ${d.type} request from ${d.student}${d.priority === 'urgent' ? ' (urgent)' : ''}`,
  leaveStatusUpdate: (d) => `Your leave / gate-pass request was ${d.status}`,
  newComplaint: (d) => `New ${d.priority}-priority complaint${d.isRecurring ? ' (recurring)' : ''}`,
  complaintStatusUpdate: (d) => `Your complaint is now ${d.status}`,
  newCertificateRequest: (d) => `New ${d.type} certificate request from ${d.student}`,
  certificateApproved: () => 'Your certificate is ready to download',
  certificateRejected: () => 'Your certificate request was rejected',
  newNotice: (d) => `New notice: ${d.title}`,
  newFeeQuery: (d) => `New fee query: ${d.subject}`,
  feeQueryReply: () => 'You have a new reply on a fee query',
}

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [socket, setSocket] = useState(null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!userId) return

    const s = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') } })

    const show = (text) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, text }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
    }

    Object.entries(messages).forEach(([event, toText]) => {
      s.on(event, (data) => show(toText(data || {})))
    })

    setSocket(s)
    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [userId])

  return (
    <SocketContext.Provider value={socket}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-xs rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)