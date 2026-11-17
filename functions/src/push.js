import { createHash } from 'node:crypto'
import { getMessaging } from 'firebase-admin/messaging'
import { FieldPath } from 'firebase-admin/firestore'
import { adminServices } from './firebase.js'
import { getNews } from './news.js'
import { getProfile } from './store.js'

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

async function deliver(device) {
  const { uid, token, since } = device.data()
  const profile = await getProfile(uid)
  if (!profile.topicIds.length || profile.notificationsEnabled === false) return
  const { items } = await getNews({ topics: profile.topicIds, limit: 20 })
  const after = Math.max(since, profile.notificationsChangedAt || 0)
  const latest = items.filter(item => Date.parse(item.publishedAt) > after && Date.parse(item.publishedAt) <= Date.now())
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0]
  if (!latest) return
  const messaging = getMessaging()
  try {
    await messaging.send({ token, data: { title: latest.title, publisher: latest.publisher, articleId: latest.id, uid } })
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') { await registerDevice(uid, token, true); return }
    throw error
  }
  await adminServices().db.runTransaction(async tx => {
    const current = (await tx.get(device.ref)).data()
    if (current?.uid === uid && current.since === since) tx.update(device.ref, { since: Date.parse(latest.publishedAt) })
  })
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
