import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { dispatchNewsPush } from './push.js'
import { createApp } from './app.js'

export const api = onRequest({ region: 'asia-northeast3', timeoutSeconds: 300, memory: '1GiB', maxInstances: 3, secrets: ['MONOROUTER_API_KEY'] }, createApp())
export const notifyInterestNews = onSchedule({ schedule: 'every 15 minutes', region: 'asia-northeast3', maxInstances: 1, timeoutSeconds: 540 }, dispatchNewsPush)
