import { relatedCandidates, publisherKey } from './news.js'
import { readArticle } from './articles.js'
import { compareArticles } from './ai.js'

const notices = {
  'search-unavailable': '다른 관점의 기사 검색에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  'no-candidates': '같은 사건·쟁점의 비교 기사 후보를 찾지 못했어요.',
  'read-failed': '관련 기사를 찾았지만 본문을 읽지 못해 관점을 비교하지 못했어요.',
  'no-distinct-perspective': '본문을 확인한 관련 보도에서는 다른 관점을 찾지 못했어요.',
  'analysis-failed': '관련 기사 본문은 확보했지만 AI 관점 비교를 완료하지 못했어요.',
  timeout: '다른 관점 비교가 오래 걸려 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
}
const empty = status => ({ reports: [], comparison: '', originalFocus: '', comparisonStatus: status, comparisonNotice: notices[status] })

/** Bounded retries and explicit outcomes keep a provider failure distinct from "no other perspective". */
export async function buildComparison(article, keywords, {
  queries = [], signal, findRelated = relatedCandidates, articleReader = readArticle, compare = compareArticles,
} = {}) {
  const comparisonSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(95_000)]) : AbortSignal.timeout(95_000)
  let stage = 'search'
  try {
    const search = await findRelated(article, keywords, { queries, signal: comparisonSignal })
    comparisonSignal.throwIfAborted()
    // Preserve the existing injection contract used by local/emulator callers.
    const candidates = (Array.isArray(search) ? search : search.items).slice(0, 16)
    if (!candidates.length) return empty(search.partial ? 'search-unavailable' : 'no-candidates')
    stage = 'read'
    const related = []
    const seenUrls = new Set([article.sourceUrl])
    const seenText = new Set([article.originalParagraphs.join('').replace(/\s+/g, '')])
    const publisherCounts = new Map()
    const sourcePublisher = publisherKey(article.sourceUrl)
    let failures = 0
    // Read three at a time. A blocked/paywalled site leaves room for later candidates.
    for (let offset = 0; offset < candidates.length && related.length < 8; offset += 3) {
      comparisonSignal.throwIfAborted()
      const batch = await Promise.allSettled(candidates.slice(offset, offset + 3).map(item =>
        articleReader(item.sourceUrl, AbortSignal.any([comparisonSignal, AbortSignal.timeout(8000)]))))
      for (const result of batch) {
        if (result.status === 'rejected') { failures++; continue }
        const item = result.value
        const key = publisherKey(item.sourceUrl)
        const text = item.originalParagraphs.join('').replace(/\s+/g, '')
        if (!text || !key || key === sourcePublisher || seenUrls.has(item.sourceUrl) || seenText.has(text) || (publisherCounts.get(key) || 0) >= 2 || related.length >= 8) continue
        seenUrls.add(item.sourceUrl)
        seenText.add(text)
        publisherCounts.set(key, (publisherCounts.get(key) || 0) + 1)
        related.push(item)
      }
    }
    comparisonSignal.throwIfAborted()
    if (!related.length) return empty('read-failed')
    stage = 'analysis'
    const result = await compare(article, related, comparisonSignal)
    comparisonSignal.throwIfAborted()
    if (!result.reports.length) return empty('no-distinct-perspective')
    const partial = failures > 0 || Boolean(search.partial)
    return {
      ...result, comparisonStatus: partial ? 'partial' : 'ready',
      ...(partial ? { comparisonNotice: '일부 기사에 접근하지 못해, 본문을 확인한 보도만 비교했어요.' } : {}),
    }
  } catch (error) {
    signal?.throwIfAborted()
    console.warn('EasyNews comparison incomplete', { stage, code: error.code || error.name || 'UNKNOWN' })
    return empty(comparisonSignal.aborted ? 'timeout' : stage === 'search' ? 'search-unavailable' : stage === 'read' ? 'read-failed' : 'analysis-failed')
  }
}
