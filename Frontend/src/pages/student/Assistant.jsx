import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { askAI } from '../../services/aiService'
import { useAuth } from '../../context/AuthContext'

// Loaded only when this page opens, so a markdown problem can never blank the whole app
const ReactMarkdown = lazy(() => import('react-markdown'))

const suggestions = [
  'Explain DBMS normalization simply',
  'Make short revision notes on Operating System',
  'Give me 5 quiz questions on Java OOP',
  'Mera attendance kitna hai?',
  'Is hafte ka timetable batao',
  'Make a 7 day study plan for exams',
]

const md = {
  p: ({ node, ...p }) => <p className="mb-2 last:mb-0" {...p} />,
  ul: ({ node, ...p }) => <ul className="mb-2 list-disc space-y-1 pl-5" {...p} />,
  ol: ({ node, ...p }) => <ol className="mb-2 list-decimal space-y-1 pl-5" {...p} />,
  h1: ({ node, ...p }) => <h3 className="mb-1 mt-2 text-base font-bold" {...p} />,
  h2: ({ node, ...p }) => <h3 className="mb-1 mt-2 text-base font-bold" {...p} />,
  h3: ({ node, ...p }) => <h4 className="mb-1 mt-2 font-semibold" {...p} />,
  a: ({ node, ...p }) => <a className="text-indigo-600 underline" target="_blank" rel="noreferrer" {...p} />,
  pre: ({ node, ...p }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100" {...p} />
  ),
  code: ({ node, className, children, ...p }) =>
    className ? (
      <code className={className} {...p}>
        {children}
      </code>
    ) : (
      <code className="rounded bg-slate-200 px-1 py-0.5 text-[0.85em] text-slate-800" {...p}>
        {children}
      </code>
    ),
}

// If markdown fails for any reason, show the plain text instead of crashing
class Safe extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <div className="whitespace-pre-wrap">{this.props.text}</div>
    return this.props.children
  }
}

function Answer({ text }) {
  return (
    <Safe text={text}>
      <Suspense fallback={<div className="whitespace-pre-wrap">{text}</div>}>
        <ReactMarkdown components={md}>{text}</ReactMarkdown>
      </Suspense>
    </Safe>
  )
}

export default function Assistant() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (content) => {
    const q = (content ?? text).trim()
    if (!q || loading) return
    setError('')
    setText('')
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const answer = await askAI(next)
      setMessages([...next, { role: 'assistant', content: answer }])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the AI. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const reset = () => {
    setMessages([])
    setError('')
    setText('')
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campus AI</h1>
          <p className="text-sm text-slate-500">Ask anything about your studies, code, notes or campus data.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100">
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-white p-4">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <div className="text-4xl">🤖</div>
            <h2 className="mt-2 text-lg font-semibold">Hi {user.name?.split(' ')[0]}, what shall we learn today?</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1.5 text-sm text-slate-700 hover:bg-indigo-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'whitespace-pre-wrap bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.role === 'user' ? m.content : <Answer text={m.content} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">Thinking...</div>
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type your question... (Enter to send, Shift+Enter for new line)"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => send()}
          disabled={loading || !text.trim()}
          className="rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}