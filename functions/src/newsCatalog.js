import { createHash, randomInt } from 'node:crypto'
import { articleId } from './articles.js'
import { adminServices } from './firebase.js'

// Enough recent articles for one day of matching across every topic.
const catalogLimit = 600
let recent

export async function readStoredNews(db = adminServices().db) {
  if (recent?.db === db && Date.now() < recent.expires) return recent.result
  const result = db.collection('newsArticles').orderBy('publishedAt', 'desc').limit(catalogLimit).get()
    .then(snapshot => ({ items: uniqueNews(snapshot.docs.map(doc => doc.data())) }))
  recent = { db, result, expires: Date.now() + 5 * 60_000 }
  try {
    const news = await result
    if (!news.items.length && recent?.result === result) recent = undefined
    return news
  } catch (error) {
    if (recent?.result === result) recent = undefined
    throw error
  }
}

export function newsIdentity(item) {
  const url = new URL(item.sourceUrl)
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.*|fbclid|gclid|dclid|msclkid)$/i.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.sort()
  const normalize = text => (text || '').normalize('NFKC').replace(/\s+/g, ' ').trim()
  const excerpt = normalize(item.excerpt)
  const contentKey = excerpt.length >= 20 && normalize(item.title)
    ? createHash('sha256').update(JSON.stringify([url.hostname.replace(/^(?:www\.|m\.)/, ''), normalize(item.title), excerpt])).digest('hex')
    : null
  return { newsKey: articleId(url.href), contentKey }
}

// Keep the original link/ID for opening the article. Tracking parameters only
// affect link identity, never the address passed to the publisher.
export function uniqueNews(items) {
  const byUrl = new Map()
  for (const item of items) {
    const identity = newsIdentity(item)
    const previous = byUrl.get(identity.newsKey)
    if (!previous || item.publishedAt > previous.publishedAt) byUrl.set(identity.newsKey, { ...item, ...identity })
  }
  const fingerprints = new Set()
  return [...byUrl.values()].filter(item => {
    if (!item.contentKey) return true
    if (fingerprints.has(item.contentKey)) return false
    fingerprints.add(item.contentKey)
    return true
  })
}

const fields = ['title', 'excerpt', 'publishedAt', 'publisher', 'topicId', 'imageUrl']

export async function storeNewsCandidates(db, items, observedAt) {
  const unique = uniqueNews(items)
  const catalog = db.collection('newsArticles')
  const stored = []
  for (let start = 0; start < unique.length; start += 100) {
    const batch = unique.slice(start, start + 100)
    const records = await db.runTransaction(async tx => {
      const snapshots = await tx.getAll(...batch.map(item => catalog.doc(item.newsKey)))
      return snapshots.map((snapshot, index) => {
        const item = batch[index]
        const previous = snapshot.data()
        if (previous && (previous.updatedAt > observedAt || fields.every(field => previous[field] === item[field] || (field === 'imageUrl' && item[field] === undefined)))) return previous
        const record = { ...item, firstSeenAt: previous?.firstSeenAt ?? observedAt, updatedAt: observedAt,
          // AI matching tags describe the same story; keep them while the headline is unchanged.
          ...(previous?.tags && previous.title === item.title ? { tags: previous.tags } : {}),
          // Enriched later (og:image, similar stories, region hint); search results do not carry them.
          ...Object.fromEntries(['imageUrl', 'imageCheckedAt', 'regionHint', 'similar', 'similarAt'].filter(key => previous?.[key] !== undefined && item[key] === undefined).map(key => [key, previous[key]])) }
        tx.set(snapshot.ref, record)
        return record
      })
    })
    stored.push(...records)
    if (recent?.db === db) recent = undefined
  }
  return stored
}

export function clearNewsCache() { recent = undefined }

export async function getNewsItem(id, db = adminServices().db) {
  const cached = recent?.db === db && Date.now() < recent.expires ? (await recent.result.catch(() => ({ items: [] }))).items.find(item => item.newsKey === id) : undefined
  if (cached) return cached
  const snapshot = await db.collection('newsArticles').doc(id).get()
  return snapshot.exists ? snapshot.data() : null
}

export async function topicNews(topicIds, load = readStoredNews) {
  const { items: catalog } = await load()
  const available = [...new Set(catalog.map(item => item.topicId))]
  const topics = topicIds.length || !available.length ? topicIds : [available[randomInt(available.length)]]
  const groups = topics.map(topic => catalog.filter(item => item.topicId === topic))
  const items = []
  for (let index = 0; items.length < 10 && groups.some(group => group.length > index); index++) {
    for (const group of groups) {
      if (group[index] && items.length < 10) items.push(group[index])
    }
  }
  return { items, total: items.length, hasMore: false, source: 'catalog', waitingForCollection: !catalog.length }
}

export async function topicNotifications({ topicIds, notificationsEnabled }) {
  if (!topicIds?.length || notificationsEnabled === false) return []
  const { items } = await readStoredNews()
  return items.filter(item => topicIds.includes(item.topicId)).slice(0, 20)
}
