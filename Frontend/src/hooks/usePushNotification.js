import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

const urlBase64ToUint8Array = (base64) => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const getSub = async () => {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export default function usePushNotification() {
  const supported = isSupported()
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // If this browser is already subscribed, attach it to the user who is logged in now
  useEffect(() => {
    if (!supported || Notification.permission !== 'granted') return
    let alive = true
    getSub()
      .then(async (sub) => {
        if (!sub || !alive) return
        await api.post('/push/subscribe', sub.toJSON())
        if (alive) setSubscribed(true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [supported])

  const enable = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        throw new Error('Notifications are blocked. Allow them in the browser site settings.')
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const { data } = await api.get('/push/public-key')
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        }))

      await api.post('/push/subscribe', sub.toJSON())
      setSubscribed(true)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not enable notifications')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const sub = await getSub()
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      setError(err.message || 'Could not turn off notifications')
    } finally {
      setBusy(false)
    }
  }, [])

  // On logout: stop this device receiving this user's alerts.
  // The browser stays subscribed, and the next login re-attaches it.
  const detach = useCallback(async () => {
    if (!supported) return
    try {
      const sub = await getSub()
      if (sub) await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
    } catch {
      /* logging out anyway */
    }
  }, [supported])

  return { supported, permission, subscribed, busy, error, enable, disable, detach }
}