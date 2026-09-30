import { useCallback, useEffect, useState } from 'react'

const MODE_KEY = 'campus_offline_mode'
const QUEUE_KEY = 'campus_sync_queue'

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export default function useOfflineSync() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(MODE_KEY) === '1')
  const [queued, setQueued] = useState(() => readQueue().length)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [toast, setToast] = useState('')

  const refresh = useCallback(() => setQueued(readQueue().length), [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('campus-sync-queue', refresh)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('campus-sync-queue', refresh)
    }
  }, [refresh])

  const toggle = (next) => {
    setEnabled(next)
    localStorage.setItem(MODE_KEY, next ? '1' : '0')
    setToast(next ? 'Offline write-queue ON — mutations stay on this device until you sync.' : 'Live cloud mode.')
  }

  const flush = async () => {
    const q = readQueue()
    if (!q.length) {
      setToast('Nothing waiting to sync.')
      return
    }
    if (!navigator.onLine) {
      setToast('Connect to the internet first.')
      return
    }
    localStorage.setItem(QUEUE_KEY, '[]')
    refresh()
    window.dispatchEvent(new Event('campus-sync-queue'))
    setToast(`Cleared ${q.length} queued write(s). Re-submit any real form if the cloud still needs it.`)
  }

  return { enabled, toggle, queued, online, toast, flush }
}

export const isOfflineWriteMode = () => localStorage.getItem(MODE_KEY) === '1'

export const enqueueOfflineWrite = (config) => {
  const q = readQueue()
  q.push({
    id: crypto.randomUUID?.() || String(Date.now()),
    method: config.method,
    url: config.url,
    at: new Date().toISOString(),
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)))
  window.dispatchEvent(new Event('campus-sync-queue'))
}
