import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { adminServices } from './firebase.js'
import { getConfig } from './config.js'
import { AppError } from './errors.js'
import { newsIdentity } from './newsCatalog.js'

export const usageDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
const userRef = uid => adminServices().db.collection('users').doc(uid)

const profileFields = ['topicIds', 'customKeywords', 'ageGroup', 'gender', 'occupation', 'occupationOther', 'nickname', 'privacyConsent', 'completed', 'keywordWeights', 'notificationsEnabled']
export const nicknameKey = nickname => nickname.normalize('NFKC').toLocaleLowerCase('ko')

export async function getProfile(uid) {
  const snapshot = await userRef(uid).get()
  const data = snapshot.data() || {}
  return { topicIds: [], customKeywords: [], completed: false, keywordWeights: {}, ...Object.fromEntries(profileFields.filter(key => key in data).map(key => [key, data[key]])) }
}

/** Nicknames are unique across accounts; a reservation document is swapped atomically with the profile. */
export async function saveProfile(uid, profile) {
  const db = adminServices().db
  if (profile.nickname === undefined) {
    await userRef(uid).set({ ...profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return profile
  }
  const key = nicknameKey(profile.nickname)
  await db.runTransaction(async transaction => {
    const [user, reservation] = await Promise.all([transaction.get(userRef(uid)), transaction.get(db.collection('nicknames').doc(key))])
    if (reservation.exists && reservation.data().uid !== uid) throw new AppError('NICKNAME_TAKEN', '이미 쓰고 있어요. 다른 닉네임을 적어 주세요.', 409)
    const previous = user.data()?.nickname
    if (previous && nicknameKey(previous) !== key) transaction.delete(db.collection('nicknames').doc(nicknameKey(previous)))
    transaction.set(db.collection('nicknames').doc(key), { uid, updatedAt: FieldValue.serverTimestamp() })
    transaction.set(userRef(uid), { ...profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  })
  return profile
}

export async function nicknameAvailable(nickname, uid) {
  const snapshot = await adminServices().db.collection('nicknames').doc(nicknameKey(nickname)).get()
  return !snapshot.exists || snapshot.data().uid === uid
}

const expansionCache = new Map()
const expansionRef = key => adminServices().db.collection('keywordExpansions').doc(key)

/** AI meaning expansions of typed keywords, shared by every reader who typed the same keyword. */
export async function getKeywordExpansions(keys) {
  const now = Date.now()
  const result = {}
  const missing = []
  for (const key of new Set(keys)) {
    const hit = expansionCache.get(key)
    if (hit && hit.until > now) result[key] = hit.value
    else missing.push(key)
  }
  if (missing.length) {
    const snapshots = await adminServices().db.getAll(...missing.map(expansionRef))
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return
      const { terms = [], meaningful = false } = snapshot.data()
      result[missing[index]] = { terms, meaningful }
      expansionCache.set(missing[index], { value: result[missing[index]], until: now + 10 * 60_000 })
    })
  }
  return result
}

export async function saveKeywordExpansion(key, keyword, value) {
  await expansionRef(key).set({ keyword, ...value, createdAt: FieldValue.serverTimestamp() })
  expansionCache.set(key, { value, until: Date.now() + 10 * 60_000 })
}

export async function getFeedbackMap(uid) {
  const snapshot = await userRef(uid).collection('feedback').orderBy('updatedAt', 'desc').limit(300).get()
  return Object.fromEntries(snapshot.docs.map(document => [document.id, document.data().value]))
}

/** Stores one answer per article and moves the article's topic/keyword weights by one step (bounded to ±3). */
export async function saveFeedback(uid, id, value, keys) {
  const db = adminServices().db
  await db.runTransaction(async transaction => {
    const feedbackRef = userRef(uid).collection('feedback').doc(id)
    const [user, previous] = await Promise.all([transaction.get(userRef(uid)), transaction.get(feedbackRef)])
    const weights = { ...user.data()?.keywordWeights }
    const step = direction => { for (const key of keys) weights[key] = Math.max(-3, Math.min(3, (weights[key] || 0) + direction)) }
    const prior = previous.data()?.value
    if (prior === value) return
    if (prior) step(prior === 'good' ? -1 : 1)
    step(value === 'good' ? 1 : -1)
    for (const key of Object.keys(weights)) if (!weights[key]) delete weights[key]
    transaction.set(feedbackRef, { value, updatedAt: FieldValue.serverTimestamp() })
    transaction.set(userRef(uid), { keywordWeights: weights }, { merge: true })
  })
  return { value }
}

export async function getArticleState(uid, id) {
  const [feedback, bookmark] = await Promise.all([userRef(uid).collection('feedback').doc(id).get(), userRef(uid).collection('bookmarks').doc(id).get()])
  return { feedback: feedback.data()?.value || null, bookmarked: bookmark.exists }
}

export async function setBookmark(uid, id, saved) {
  const ref = userRef(uid).collection('bookmarks').doc(id)
  if (saved) await ref.set({ savedAt: FieldValue.serverTimestamp() })
  else await ref.delete()
  return { bookmarked: saved }
}

export async function getCachedReason(uid, id, profileKey) {
  const snapshot = await userRef(uid).collection('reasons').doc(id).get()
  return snapshot.exists && snapshot.data().profileKey === profileKey ? snapshot.data().text : null
}

export async function saveReason(uid, id, profileKey, text) {
  await userRef(uid).collection('reasons').doc(id).set({ text, profileKey, createdAt: FieldValue.serverTimestamp() })
}

export async function findConvertedArticle(uid, id) {
  return getArticle(uid, id).catch(error => { if (error.code === 'ARTICLE_NOT_FOUND') return null; throw error })
}

const roomRef = (uid, id) => userRef(uid).collection('chatRooms').doc(id)
const MESSAGE_LIMIT = 100
const publicRoom = ({ context: _context, createdAt, updatedAt, ...room }) => ({ ...room, createdAt: millis(createdAt), updatedAt: millis(updatedAt) })
const millis = value => typeof value?.toMillis === 'function' ? value.toMillis() : value || 0

export async function listChatRooms(uid) {
  const snapshot = await userRef(uid).collection('chatRooms').orderBy('updatedAt', 'desc').limit(50).get()
  return snapshot.docs.map(document => publicRoom(document.data()))
}

export async function getChatRoom(uid, id, { withContext = false } = {}) {
  const snapshot = await roomRef(uid, id).get()
  if (!snapshot.exists) return { room: null, messages: [] }
  const messages = await roomRef(uid, id).collection('messages').orderBy('createdAt', 'asc').limitToLast(MESSAGE_LIMIT).get()
  return {
    room: withContext ? { ...publicRoom(snapshot.data()), context: snapshot.data().context } : publicRoom(snapshot.data()),
    messages: messages.docs.map(document => ({ id: document.id, ...document.data() })),
  }
}

/** Appends both sides of one exchange; the room is created by its first message. */
export async function appendChatExchange(uid, id, roomData, userMessage, reply) {
  const db = adminServices().db
  const now = Date.now()
  const room = roomRef(uid, id)
  const batch = db.batch()
  const snapshot = await room.get()
  const created = !snapshot.exists
  const userDoc = { role: 'user', text: userMessage.text, ...(userMessage.quote ? { quote: userMessage.quote } : {}), createdAt: now }
  const replyDoc = { role: 'assistant', text: reply.answer, ...(reply.offTopic ? { offTopic: true } : {}), createdAt: now + 1 }
  batch.set(room, {
    ...(created ? { ...roomData, createdAt: now } : {}),
    updatedAt: now, lastMessage: { role: 'assistant', text: reply.answer.slice(0, 120) },
  }, { merge: true })
  const userRefDoc = room.collection('messages').doc()
  const replyRefDoc = room.collection('messages').doc()
  batch.set(userRefDoc, userDoc)
  batch.set(replyRefDoc, replyDoc)
  await batch.commit()
  // Trim the oldest messages beyond the per-room limit.
  const overflow = await room.collection('messages').orderBy('createdAt', 'desc').offset(MESSAGE_LIMIT).limit(50).get()
  if (!overflow.empty) {
    const cleanup = db.batch()
    overflow.docs.forEach(document => cleanup.delete(document.ref))
    await cleanup.commit()
  }
  return { created, messages: [{ id: userRefDoc.id, ...userDoc }, { id: replyRefDoc.id, ...replyDoc }] }
}

export async function deleteChatRoom(uid, id) {
  const db = adminServices().db
  const room = roomRef(uid, id)
  for (;;) {
    const page = await room.collection('messages').limit(200).get()
    if (page.empty) break
    const batch = db.batch()
    page.docs.forEach(document => batch.delete(document.ref))
    await batch.commit()
  }
  await room.delete()
  return { deleted: true }
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
    return { id, newsKey: newsIdentity({ sourceUrl }).newsKey, title: easyTitle || title, topicId, publisher, sourceUrl, publishedAt, excerpt, ...(imageUrl ? { imageUrl } : {}) }
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
