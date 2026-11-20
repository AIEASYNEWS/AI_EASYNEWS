import { createHash } from 'node:crypto'
import { getMessaging } from 'firebase-admin/messaging'
import { FieldPath } from 'firebase-admin/firestore'
import { adminServices } from './firebase.js'
import { getProfile } from './store.js'
import { topicNotifications } from './newsCatalog.js'

const devices = () => adminServices().db.collection('pushDevices')
const deviceId = token => createHash('sha256').update(token).digest('hex')

export async function registerDevice(uid, token, remove) {
  const ref = devices().doc(deviceId(token))
  await adminServices().db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data()
    if (remove) { if (current?.uid === uid) tx.delete(ref) }
    else if (current?.uid !== uid) tx.set(ref, { uid, token, since: Date.now() })
  })
  return { ok: true }
}

const cooldown = 30 * 60_000
const day = 24 * 3600_000

function eligibleArticles(items, since, profile, now) {
  const after = Math.max(since, profile.notificationsChangedAt || 0, now - day)
  return items.filter(item => Date.parse(item.publishedAt) > after && Date.parse(item.publishedAt) <= now)
}

export async function reservePush(db, device, profile, items, now) {
  const { uid, since } = device.data()
  const fresh = eligibleArticles(items, since, profile, now)
  fresh.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  if (!fresh.length) return null
  const user = db.collection('users').doc(uid)
  const receipts = user.collection('pushDeliveries')
  const keysFor = item => [item.newsKey, ...(item.contentKey ? [item.contentKey] : [])]
    .map(key => receipts.doc(device.id + '_' + key))
  return db.runTransaction(async tx => {
    const [current, settings] = await tx.getAll(device.ref, user)
    const state = current.data()
    if (state?.uid !== uid || state.since !== since || state.nextPushAt > now ||
        settings.get('notificationsEnabled') === false || settings.get('notificationsChangedAt') !== profile.notificationsChangedAt) return null
    const refs = new Map(fresh.flatMap(keysFor).map(ref => [ref.id, ref]))
    const previous = await tx.getAll(...refs.values())
    const used = new Set(previous.filter(doc => doc.exists).map(doc => doc.id))
    const item = fresh.find(candidate => keysFor(candidate).every(ref => !used.has(ref.id)))
    if (!item) return null
    const [receipt, alias] = keysFor(item)
    tx.create(receipt, { newsKey: item.newsKey, status: 'reserved', reservedAt: now })
    if (alias) tx.create(alias, { newsKey: item.newsKey })
    tx.update(device.ref, { nextPushAt: now + cooldown })
    return { item, receipt, alias }
  })
}

async function deliver(device) {
  const { uid, token, nextPushAt } = device.data()
  if (nextPushAt > Date.now()) return
  const profile = await getProfile(uid)
  const items = await topicNotifications(profile)
  const db = adminServices().db
  const now = Date.now()
  const claim = await reservePush(db, device, profile, items, now)
  if (!claim) return
  const { item, receipt, alias } = claim
  let messageId
  try {
    messageId = await getMessaging().send({ token, data: { title: item.title, publisher: item.publisher, articleId: item.id, newsKey: item.newsKey, sourceUrl: item.sourceUrl, uid } })
  } catch (error) {
    if (['messaging/quota-exceeded', 'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded'].includes(error.code)) {
      // FCM explicitly rejected this attempt. Release only its own reservation.
      await db.runTransaction(async tx => {
        const [current, reserved] = await tx.getAll(device.ref, receipt)
        if (reserved.get('reservedAt') !== now) return
        tx.delete(receipt)
        if (alias) tx.delete(alias)
        if (current.get('uid') === uid && current.get('nextPushAt') === now + cooldown) {
          tx.update(device.ref, { nextPushAt: 0 })
        }
      })
    } else if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) {
      await receipt.update({ status: 'invalid-device' })
      await registerDevice(uid, token, true)
      return
    } else {
      // A timeout can occur after FCM accepted the message. Preserve the key.
      await receipt.update({ status: 'unconfirmed' })
    }
    throw error
  }
  await receipt.update({ status: 'accepted', acceptedAt: Date.now(), messageId })
}

export async function dispatchNewsPush() {
  let cursor
  let failures = 0
  do {
    let query = devices().orderBy(FieldPath.documentId()).limit(100)
    if (cursor) query = query.startAfter(cursor)
    const page = await query.get()
    for (let i = 0; i < page.size; i += 8) {
      const results = await Promise.allSettled(page.docs.slice(i, i + 8).map(deliver))
      failures += results.filter(r => r.status === 'rejected').length
    }
    cursor = page.size === 100 ? page.docs.at(-1) : undefined
  } while (cursor)
  if (failures) throw new Error(`Failed to deliver news to ${failures} devices`)
}
