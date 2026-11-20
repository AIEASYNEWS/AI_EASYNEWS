import { safeFetchText, parsePublicUrl } from './safeFetch.js'
import { clearNewsCache } from './newsCatalog.js'

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

/** Representative image (og:image / twitter:image) of a public article page; null when absent or unsafe. */
export function extractImage(html, pageUrl) {
  const head = html.slice(0, 300_000)
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/i,
  ]
  for (const pattern of patterns) {
    const match = head.match(pattern)
    if (!match) continue
    try {
      const url = parsePublicUrl(new URL(decode(match[1].trim()), pageUrl).href)
      if (url.protocol === 'https:') return url.href
    } catch { /* 잘못된 이미지 주소는 건너뛴다. */ }
  }
  return null
}

export async function fetchArticleImage(sourceUrl, signal) {
  const { text, url } = await safeFetchText(sourceUrl, { signal })
  return extractImage(text, url)
}

/**
 * NAVER search results carry no image, so the collector reads each new story's og:image.
 * Bounded by count, concurrency and a deadline; `imageCheckedAt` prevents retrying pages without one.
 */
export async function enrichImages(db, records, { limit = 60, concurrency = 6, deadline = Infinity, fetchImage = fetchArticleImage } = {}) {
  const now = Date.now()
  // `imageCheckedAt`: the page had no image (final). `imageFailedAt`: the page could not be read (retry after 6 hours).
  const pending = records.filter(record => record.newsKey && !record.imageUrl && !record.imageCheckedAt && !(record.imageFailedAt > now - 6 * 3600_000)).slice(0, limit)
  let found = 0
  let next = 0
  async function worker() {
    while (next < pending.length && Date.now() < deadline) {
      const record = pending[next++]
      let update
      try {
        const imageUrl = await fetchImage(record.sourceUrl, AbortSignal.timeout(6000))
        update = imageUrl ? { imageUrl } : { imageCheckedAt: Date.now() }
      } catch { update = { imageFailedAt: Date.now() } }
      Object.assign(record, update)
      if (update.imageUrl) found++
      await db.collection('newsArticles').doc(record.newsKey).set(update, { merge: true }).catch(() => {})
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker))
  if (pending.length) clearNewsCache()
  return found
}
