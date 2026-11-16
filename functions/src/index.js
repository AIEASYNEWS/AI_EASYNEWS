import { onRequest } from 'firebase-functions/v2/https'
import { createApp } from './app.js'

export const api = onRequest({ region: 'asia-northeast3', timeoutSeconds: 300, memory: '1GiB', maxInstances: 3, secrets: ['MONOROUTER_API_KEY'] }, createApp())
