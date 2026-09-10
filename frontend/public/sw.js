self.addEventListener('push', (event) => {
  let data = { title: 'Reminder', body: '' }
  try {
    data = event.data.json()
  } catch {
    // ignore malformed payloads
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})
