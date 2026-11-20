import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { dispatchNewsPush } from './push.js'
import { createApp } from './app.js'
import { collectNews } from './news.js'

export const api = onRequest({ region: 'asia-northeast3', timeoutSeconds: 300, memory: '1GiB', maxInstances: 3, secrets: ['MONOROUTER_API_KEY'] }, createApp())
export const notifyInterestNews = onSchedule({
  schedule: '*/30 * * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3', maxInstances: 1,
  timeoutSeconds: 540, secrets: ['NAVER_API_HUB_CLIENT_ID', 'NAVER_API_HUB_CLIENT_SECRET', 'MONOROUTER_API_KEY'],
}, async () => {
  await collectNews()
  await dispatchNewsPush()
})
