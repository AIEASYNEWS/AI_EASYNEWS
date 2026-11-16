import { createApp } from './app.js'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'

// Honor the developer environment's configured HTTP proxy for fixed provider APIs.
// Arbitrary article fetching keeps its separate DNS-pinned dispatcher.
if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) setGlobalDispatcher(new EnvHttpProxyAgent())

if (process.argv.includes('--emulators') || process.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  process.env.GCLOUD_PROJECT = 'demo-ai-easynews'
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GCLOUD_PROJECT) {
  console.warn('Firebase 연결이 아직 설정되지 않았습니다. 로컬 테스트는 npm run dev:local을 사용하세요.')
}
createApp().listen(8787, '127.0.0.1', () => console.log('EasyNews API: http://127.0.0.1:8787'))
