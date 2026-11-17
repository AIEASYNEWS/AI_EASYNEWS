self.addEventListener('push', event => {
  const data = event.data?.json()?.data
  if (!data?.articleId || !data.title) return
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.publisher, tag: data.articleId, icon: '/favicon.svg',
    data: { path: '/#/notifications' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/#/notifications'))
})
