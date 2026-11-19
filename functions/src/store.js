import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { adminServices } from './firebase.js'
import { getConfig } from './config.js'
import { AppError } from './errors.js'

export const usageDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
const userRef = uid => adminServices().db.collection('users').doc(uid)

export async function getProfile(uid) {
  const snapshot = await userRef(uid).get()
  return { topicIds: [], completed: false, ...snapshot.data() }
}

export async function saveProfile(uid, profile) {
  await userRef(uid).set({ ...profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return profile
}

export async function getQuota(uid) {
  const limit = getConfig().freeDailyLimit
  if (limit === null) return { remaining: null, limit: null, unlimited: true }
  const usage = await userRef(uid).collection('usage').doc(usageDay()).get()
  const count = usage.data()?.count || 0
  const pending = Object.values(usage.data()?.pending || {}).filter(expiry => expiry > Date.now()).length
  return { remaining: Math.max(0, limit - count - pending), limit, resetTimezone: 'Asia/Seoul' }
}

/** A lease counts concurrent requests, expires after a crashed process, and rolls back on failure. */
export async function reserveConversion(uid, unlimited = false) {
  const db = adminServices().db
  const ref = userRef(uid).collection('usage').doc(usageDay())
  const leaseId = randomUUID()
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const count = snapshot.data()?.count || 0
    const pending = Object.fromEntries(Object.entries(snapshot.data()?.pending || {}).filter(([, expiry]) => expiry > Date.now()))
    const limit = getConfig().freeDailyLimit
    if (limit !== null && !unlimited && count + Object.keys(pending).length >= limit) throw new AppError('QUOTA_EXCEEDED', '오늘의 변환 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.', 429)
    transaction.set(ref, { count, pending: { ...pending, [leaseId]: Date.now() + 5 * 60_000 } })
  })
  let settled = false
  return async (article) => {
    if (settled) return
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref)
      const pending = { ...snapshot.data()?.pending }
      if (!pending[leaseId]) return
      delete pending[leaseId]
      transaction.set(ref, { count: (snapshot.data()?.count || 0) + (article ? 1 : 0), pending })
      if (article) transaction.set(userRef(uid).collection('articles').doc(article.id), { ...JSON.parse(JSON.stringify(article)), savedAt: FieldValue.serverTimestamp() })
    })
    settled = true
  }
}

export async function getArticle(uid, id) {
  const snapshot = await userRef(uid).collection('articles').doc(id).get()
  if (!snapshot.exists) throw new AppError('ARTICLE_NOT_FOUND', '저장된 기사를 찾지 못했어요.', 404)
  const { savedAt: _savedAt, ...article } = snapshot.data()
  return article
}

export async function getHistory(uid) {
  const snapshot = await userRef(uid).collection('articles').orderBy('savedAt', 'desc').limit(30).get()
  return snapshot.docs.map(document => {
    const { id, title, easyTitle, topicId, publisher, sourceUrl, publishedAt, excerpt, imageUrl } = document.data()
    return { id, title: easyTitle || title, topicId, publisher, sourceUrl, publishedAt, excerpt, ...(imageUrl ? { imageUrl } : {}) }
  })
}

export async function reserveQuestion(uid) {
  const db = adminServices().db
  const ref = userRef(uid).collection('questionUsage').doc(usageDay())
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const count = snapshot.data()?.count || 0
    if (count >= 30) throw new AppError('QUESTION_LIMIT', '오늘의 AI 질문 한도를 사용했어요. 내일 다시 이용해 주세요.', 429)
    transaction.set(ref, { count: count + 1 })
  })
}

export async function notificationReads(uid) {
  const snapshot = await userRef(uid).collection('notificationReads').orderBy('readAt', 'desc').limit(100).get()
  return new Set(snapshot.docs.map(document => document.id))
}

export async function markNotificationRead(uid, id) {
  await userRef(uid).collection('notificationReads').doc(id).set({ readAt: FieldValue.serverTimestamp() })
  return { ok: true }
}
