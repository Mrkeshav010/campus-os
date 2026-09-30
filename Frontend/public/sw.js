// Service worker: shows push notifications even when the tab or browser is closed.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Campus Connect', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    (async () => {
      // If the app is open and visible, the in-app toast already shows it
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (wins.some((w) => w.visibilityState === 'visible')) return

      await self.registration.showNotification(data.title || 'Campus Connect', {
        body: data.body || '',
        icon: '/vite.svg',
        badge: '/vite.svg',
        data: { url: data.url || '/' },
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})