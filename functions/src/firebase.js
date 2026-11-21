import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync } from 'node:fs'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getConfig } from './config.js'
import { AppError } from './errors.js'
import { createProxyFirestore } from './firestoreProxy.js'
import { HttpsProxyAgent } from 'https-proxy-agent'

let emulatorCredential
let emulatorDbConfigured = false
let proxyDb

export function environmentCredential(projectId, value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  if (!value?.trim()) return undefined
  try {
    const account = JSON.parse(value)
    if (account.type !== 'service_account' || account.project_id !== projectId ||
        typeof account.client_email !== 'string' || !account.client_email.endsWith(`@${projectId}.iam.gserviceaccount.com`) ||
        typeof account.private_key !== 'string') throw new Error('Invalid service account')
    return cert(account)
  } catch {
    throw new AppError('FIREBASE_NOT_CONFIGURED', '데이터 저장 서버의 인증 설정을 확인해 주세요.', 503)
  }
}

export function adminServices() {
  const projectId = getConfig().projectId
  const emulatorOnly = projectId.startsWith('demo-') && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099' && process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080'
  const managedRuntime = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.FUNCTION_NAME)
  const hostedRuntime = managedRuntime || process.env.VERCEL === '1'
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  const configuredCredential = emulatorOnly ? undefined : environmentCredential(projectId)
  if (!emulatorOnly && !managedRuntime && !configuredCredential && (!credentialPath || !existsSync(credentialPath))) {
    throw new AppError('FIREBASE_NOT_CONFIGURED', '데이터 저장 서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.', 503)
  }
  // A locally generated, unregistered certificate prevents ADC / Google metadata
  // discovery. It has no cloud permissions and exists only in memory for emulators.
  if (emulatorOnly && !emulatorCredential) {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
    emulatorCredential = cert({ projectId, clientEmail: 'emulator@demo-ai-easynews.invalid', privateKey })
  }
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
  const localProxy = !emulatorOnly && !hostedRuntime && proxyUrl
  const app = getApps().find(entry => entry.name === '[DEFAULT]') || initializeApp({
    projectId,
    ...(emulatorOnly ? { credential: emulatorCredential } : configuredCredential ? { credential: configuredCredential } : {}),
    ...(localProxy ? { httpAgent: new HttpsProxyAgent(proxyUrl) } : {}),
  })
  const dataProjectId = !emulatorOnly && process.env.FIRESTORE_DATA_PROJECT_ID?.trim()
  const dataApp = dataProjectId && dataProjectId !== projectId
    ? getApps().find(entry => entry.name === 'news-data') || initializeApp({
        projectId: dataProjectId,
        credential: app.options.credential,
      }, 'news-data')
    : app
  const db = localProxy && dataApp === app
    ? proxyDb ??= createProxyFirestore(projectId, credentialPath, proxyUrl)
    : getFirestore(dataApp)
  if (emulatorOnly && !emulatorDbConfigured) {
    db.settings({ grpcOptions: { 'grpc.enable_http_proxy': 0 } })
    emulatorDbConfigured = true
  }
  return { auth: getAuth(app), db }
}

export async function requireUser(request) {
  const match = /^Bearer (.+)$/.exec(request.headers.authorization || '')
  if (!match) throw new AppError('AUTH_REQUIRED', '로그인이 필요해요.', 401)
  const { auth } = adminServices()
  try {
    const claims = await auth.verifyIdToken(match[1])
    return { uid: claims.uid, anonymous: claims.firebase?.sign_in_provider === 'anonymous' }
  } catch {
    throw new AppError('SESSION_EXPIRED', '로그인 정보를 확인하지 못했어요. 다시 로그인해 주세요.', 401)
  }
}
