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
  let reports = []
  let originalFocus = ''
  const matched = partial => ({
    reports, originalFocus, comparison: reports.map(report => report.focus).filter(Boolean).join('\n\n'),
    comparisonStatus: partial ? 'partial' : 'ready',
    ...(partial ? { comparisonNotice: '일부 기사 검색이나 비교를 완료하지 못해, 확인한 보도만 보여드려요.' } : {}),
  })
  try {
    const search = await findRelated(article, keywords, { queries, signal: comparisonSignal })
    comparisonSignal.throwIfAborted()
    // Preserve the existing injection contract used by local/emulator callers.
    const candidates = (Array.isArray(search) ? search : search.items).slice(0, 16)
    if (!candidates.length) return empty(search.partial ? 'search-unavailable' : 'no-candidates')
    const seenUrls = new Set([article.sourceUrl])
    const seenText = new Set([article.originalParagraphs.join('').replace(/\s+/g, '')])
    const publisherCounts = new Map()
    const sourcePublisher = publisherKey(article.sourceUrl)
    let failures = 0
    let compared = 0
    let unverified = false
    let offset = 0
    while (offset < candidates.length) {
      stage = 'read'
      const related = []
      while (offset < candidates.length && related.length < 8) {
        comparisonSignal.throwIfAborted()
        const next = candidates.slice(offset, offset + (8 - related.length))
        offset += next.length
        const batch = await Promise.allSettled(next.map(item =>
          articleReader(item.sourceUrl, AbortSignal.any([comparisonSignal, AbortSignal.timeout(8000)]))))
        for (const result of batch) {
          if (result.status === 'rejected') { failures++; continue }
          const item = result.value
          const key = publisherKey(item.sourceUrl)
          const text = item.originalParagraphs.join('').replace(/\s+/g, '')
          if (!text || !key || key === sourcePublisher || seenUrls.has(item.sourceUrl) || seenText.has(text) || (publisherCounts.get(key) || 0) >= 2) continue
          seenUrls.add(item.sourceUrl)
          seenText.add(text)
          publisherCounts.set(key, (publisherCounts.get(key) || 0) + 1)
          related.push(item)
        }
      }
      comparisonSignal.throwIfAborted()
      if (!related.length) break
      stage = 'analysis'
      const result = await compare(article, related, comparisonSignal)
      comparisonSignal.throwIfAborted()
      compared += related.length
      unverified ||= result.unverified
      const hasOpposition = result.reports.some(report => report.relation === 'opposing')
      if (result.originalFocus && (!originalFocus || hasOpposition)) originalFocus = result.originalFocus
      const ordered = [...reports, ...result.reports].sort((a, b) => Number(b.relation === 'opposing') - Number(a.relation === 'opposing'))
      const outlets = new Set()
      reports = ordered.filter(report => {
        const outlet = publisherKey(report.sourceUrl) || report.publisher || report.id
        if (outlets.has(outlet)) return false
        outlets.add(outlet)
        return true
      }).slice(0, 4)
      if (hasOpposition) break
    }
    if (!compared) return empty('read-failed')
    if (!reports.length) {
      const status = unverified ? 'evidence-unverified' : 'no-distinct-perspective'
      const reason = unverified ? '관점 차이를 뒷받침할 출처와 원문 인용을 검증하지 못했어요.' : '같은 쟁점을 다르게 설명한 근거를 확인하지 못했어요.'
      const limitation = failures || search.partial ? ' 일부 검색 또는 본문 읽기는 완료하지 못했어요.' : ''
      return { ...empty(status), comparisonNotice: `다른 언론사 기사 ${compared}건을 비교했지만 ${reason}${limitation}` }
    }
    return matched(failures > 0 || Boolean(search.partial))
  } catch (error) {
    signal?.throwIfAborted()
    console.warn('EasyNews comparison incomplete', { stage, code: error.code || error.name || 'UNKNOWN' })
    if (reports.length) return matched(true)
    return empty(comparisonSignal.aborted ? 'timeout' : stage === 'search' ? 'search-unavailable' : stage === 'read' ? 'read-failed' : 'analysis-failed')
  }
}
