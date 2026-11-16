import fs from 'node:fs'
import { Firestore } from 'firebase-admin/firestore'
import { GoogleAuth, JWT } from 'google-auth-library'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { AppError } from './errors.js'

/** Google GAX's REST agent overrides HTTP_PROXY. Honor the configured proxy
 * explicitly for local development, while retaining TLS and Google authentication.
 * Managed Google runtimes and the emulator keep their normal SDK transport. */
export function createProxyFirestore(projectId, credentialPath, proxyUrl) {
  const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'))
  if (credential.type !== 'service_account' || credential.project_id !== projectId) {
    throw new AppError('FIREBASE_NOT_CONFIGURED', '데이터 저장 서버의 프로젝트 설정을 확인해 주세요.', 503)
  }
  const agent = new HttpsProxyAgent(proxyUrl)
  class ProxyAuth extends GoogleAuth {
    async fetch(url, options = {}) {
      if (new URL(String(url)).origin !== 'https://firestore.googleapis.com') {
        throw new AppError('FIREBASE_ENDPOINT_REJECTED', '데이터 저장 서버 주소를 확인하지 못했어요.', 503)
      }
      return super.fetch(url, { ...options, agent })
    }
  }
  const authClient = new JWT({ email: credential.client_email, key: credential.private_key, scopes: ['https://www.googleapis.com/auth/datastore'] })
  return new Firestore({ projectId, preferRest: true, auth: new ProxyAuth({ projectId, authClient }) })
}
