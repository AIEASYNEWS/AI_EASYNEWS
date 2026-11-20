self.addEventListener('push', event => {
  const data = event.data?.json()?.data
  if (!data?.articleId || !data.title) return
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.publisher, tag: data.newsKey || data.articleId, icon: '/nutori-icon.png',
    data: { sourceUrl: data.sourceUrl, articleId: data.articleId },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const { sourceUrl } = event.notification.data || {}
  const path = /^https?:\/\//i.test(sourceUrl || '')
    ? '/#/articles/preview?' + new URLSearchParams({ url: sourceUrl })
    : '/#/notifications'
  event.waitUntil(self.clients.openWindow(path))
})
