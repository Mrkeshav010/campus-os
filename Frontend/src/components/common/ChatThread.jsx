import { useEffect, useRef, useState } from 'react'

const colors = {
  indigo: { mine: 'bg-indigo-600 text-white', btn: 'bg-indigo-600 hover:bg-indigo-700' },
  emerald: { mine: 'bg-emerald-600 text-white', btn: 'bg-emerald-600 hover:bg-emerald-700' },
}

// Chat-style thread. `mine` is the sender role of whoever is looking at it
// ('student' or 'admin'), so their own messages sit on the right.
export default function ChatThread({ messages, mine, onSend, accent = 'indigo', locked = false }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef(null)
  const c = colors[accent]

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [messages.length])

  const send = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setSending(true)
    setError('')
    try {
      await onSend(msg)
      setText('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div ref={boxRef} className="max-h-72 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {messages.map((m, i) => {
          const own = m.senderRole === mine
          return (
            <div key={i} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  own ? c.mine : 'border bg-white text-slate-800'
                }`}
              >
                <div className="text-[11px] opacity-70">
                  {m.senderRole === 'admin' ? 'Accounts office' : 'Student'} ·{' '}
                  {new Date(m.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</div>}

      {locked ? (
        <div className="mt-2 text-xs text-slate-500">
          This query is resolved. Start a new query if you need more help.
        </div>
      ) : (
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a reply"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            disabled={sending}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${c.btn}`}
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}