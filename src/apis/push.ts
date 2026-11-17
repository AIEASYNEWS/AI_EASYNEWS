import { apiRequest } from './client'
import { auth } from './firebase'

const key = 'easynews:push-device'
export const pushConfigured = Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID)
export function deviceRegistered() {
  return Boolean(auth?.currentUser?.uid && localStorage.getItem(key + ':uid') === auth.currentUser.uid && localStorage.getItem(key) && 'Notification' in window && Notification.permission === 'granted')
}
export async function enableDevice() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) throw new Error('이 브라우저에서 휴대폰 알림을 지원하지 않아요.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('브라우저 설정에서 알림을 허용해 주세요.')
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
  if (!await isSupported()) throw new Error('이 브라우저에서 푸시 알림을 지원하지 않아요.')
  await navigator.serviceWorker.register('/news-push-sw.js')
  const registration = await navigator.serviceWorker.ready
  const token = await getToken(getMessaging(), { serviceWorkerRegistration: registration, vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
  await apiRequest('/notification-device', { method: 'PUT', body: JSON.stringify({ token, remove: false }) })
  localStorage.setItem(key, token)
  localStorage.setItem(key + ':uid', auth!.currentUser!.uid)
}
export async function detachDevice() {
  const token = localStorage.getItem(key)
  if (!token || localStorage.getItem(key + ':uid') !== auth?.currentUser?.uid) return
  await apiRequest('/notification-device', { method: 'PUT', body: JSON.stringify({ token, remove: true }) })
  localStorage.removeItem(key)
  localStorage.removeItem(key + ':uid')
}
