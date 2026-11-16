import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'

export const usingEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
const projectId = usingEmulators ? 'demo-ai-easynews' : import.meta.env.VITE_FIREBASE_PROJECT_ID
export const firebaseConfigured = Boolean(projectId && (usingEmulators || import.meta.env.VITE_FIREBASE_API_KEY))
const app = firebaseConfigured ? initializeApp({
  apiKey: usingEmulators ? 'demo-key' : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId, appId: import.meta.env.VITE_FIREBASE_APP_ID,
}) : null
export const auth = app ? getAuth(app) : null
if (auth && usingEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

let guestSignIn: ReturnType<typeof signInAnonymously> | undefined
export async function getIdToken() {
  if (!auth) throw new Error('로그인 서비스 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.')
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser.getIdToken()
  guestSignIn ??= signInAnonymously(auth).finally(() => { guestSignIn = undefined })
  return (await guestSignIn).user.getIdToken()
}

export function authError(error: unknown) {
  const code = (error as { code?: string })?.code
  const messages: Record<string, string> = {
    'auth/invalid-credential': '이메일 또는 비밀번호를 확인해 주세요.',
    'auth/wrong-password': '이메일 또는 비밀번호를 확인해 주세요.',
    'auth/user-not-found': '이메일 또는 비밀번호를 확인해 주세요.',
    'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
    'auth/invalid-email': '올바른 이메일 주소를 입력해 주세요.',
    'auth/weak-password': '비밀번호를 8자 이상으로 입력해 주세요.',
    'auth/too-many-requests': '시도가 많아요. 잠시 후 다시 시도해 주세요.',
    'auth/network-request-failed': '로그인 서버에 연결하지 못했어요. 연결 상태를 확인해 주세요.',
    'auth/operation-not-allowed': '현재 로그인 방법을 사용할 수 없어요. 관리자에게 문의해 주세요.',
  }
  return messages[code || ''] || '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
}
