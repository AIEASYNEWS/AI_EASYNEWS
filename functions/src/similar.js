import { articleId, cleanText } from './articles.js'
import { getConfig } from './config.js'
import { adminServices } from './firebase.js'
import { articleTime, similarArticles } from './matching.js'
import { publisherKey, searchNaverHub } from './news.js'

const SIX_HOURS = 6 * 3600_000
const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '')
const words = text => String(text || '').normalize('NFKC').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 2)

/** Search terms for the same story: the AI keywords, or the headline's leading words. */
export function similarQuery(item) {
  const keywords = (item.tags?.keywords || []).map(word => cleanText(word)).filter(Boolean).slice(0, 3)
  return (keywords.length >= 2 ? keywords : words(item.title).slice(0, 5)).join(' ').slice(0, 80)
}

/** Keeps other publishers' stories about the same subject from search results (Figma FLOW 5: open the original URL). */
export function pickSimilar(item, results, limit = 3) {
  const source = publisherKey(item.sourceUrl)
  const keywords = (item.tags?.keywords || []).map(normalize).filter(word => word.length >= 2)
  const ownTitle = new Set(words(item.title).map(word => word.toLocaleLowerCase('ko')))
  const reference = articleTime(item)
  const publishers = new Set([source])
  const picked = []
  for (const candidate of results) {
    if (picked.length >= limit) break
    const key = publisherKey(candidate.sourceUrl)
    if (!key || publishers.has(key) || normalize(candidate.title) === normalize(item.title)) continue
    const time = Date.parse(candidate.publishedAt)
    if (reference && Number.isFinite(time) && Math.abs(time - reference) > 7 * 86400_000) continue
    const text = normalize(candidate.title + candidate.excerpt)
    const shared = keywords.filter(word => text.includes(word)).length
    const overlap = words(candidate.title).filter(word => ownTitle.has(word.toLocaleLowerCase('ko'))).length
    if (!shared && overlap < 2) continue
    publishers.add(key)
    picked.push({ id: articleId(candidate.sourceUrl), title: candidate.title, publisher: candidate.publisher, publishedAt: candidate.publishedAt, sourceUrl: candidate.sourceUrl, excerpt: candidate.excerpt.slice(0, 90) })
  }
  return picked
}

/** Similar stories for an article, searched on first view and shared by every reader for six hours. */
export async function findSimilar(item, catalog, { search = searchNaverHub, db = adminServices().db, now = Date.now() } = {}) {
  if (Array.isArray(item.similar) && item.similarAt > now - SIX_HOURS) return item.similar
  const { naverHub } = getConfig()
  const query = similarQuery(item)
  if (!naverHub || !query) return similarArticles(item, catalog)
  let similar
  try {
    const { items } = await search(query, naverHub, { limit: 30, sort: 'sim' })
    similar = pickSimilar(item, items)
  } catch { return similarArticles(item, catalog) }
  if (!similar.length) similar = similarArticles(item, catalog)
  Object.assign(item, { similar, similarAt: now })
  await db.collection('newsArticles').doc(item.newsKey).set({ similar, similarAt: now }, { merge: true }).catch(() => {})
  return similar
}
