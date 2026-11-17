import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNews, parseRssFeed, relatedCandidates, publisherKey } from '../src/news.js'

test('publisher RSS preserves publication dates, section topics and original links', () => {
  const items = parseRssFeed(`<rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><item><title>새 전시 &amp; 공연 안내</title><link>https://www.hani.co.kr/arti/culture/example.html</link><dc:date>2026-11-16T10:30:00+09:00</dc:date><description><![CDATA[<p>전시 소식입니다.</p>]]></description></item><item><title>잘못된 링크</title><link>file:///news</link></item></channel></rss>`, 'https://www.hani.co.kr/rss/culture/')
  assert.equal(items.length, 1)
  assert.equal(items[0].title, '새 전시 & 공연 안내')
  assert.equal(items[0].publisher, '한겨레')
  assert.equal(items[0].topicId, 'culture')
  assert.equal(items[0].publishedAt, '2026-11-16T01:30:00.000Z')
  assert.equal(items[0].sourceUrl, 'https://www.hani.co.kr/arti/culture/example.html')
  assert.equal(items[0].excerpt, '전시 소식입니다.')
})

test('real-provider metadata is normalized, deduplicated, searched and sorted', async context => {
  let calls = 0
  context.mock.method(globalThis, 'fetch', async () => {
    calls++
    return new Response(JSON.stringify({ articles: [
      { title: '기준금리 결정 소식', url: 'https://example.com/a', seendate: '20261116T030000Z' },
      { title: '과학 전시 소식', url: 'https://example.org/b', seendate: '20261116T010000Z' },
      { title: '중복된 기사', url: 'https://example.com/a', seendate: '20261116T030000Z' },
      { title: '위험한 주소', url: 'file:///not-a-news-article' },
    ] }), { headers: { 'Content-Type': 'application/json' } })
  })
  const latest = await getNews()
  assert.equal(latest.total, 2)
  assert.equal(latest.items[0].sourceUrl, 'https://example.com/a')
  assert.equal(latest.items[0].title, '기준금리 결정 소식')
  const oldest = await getNews({ sort: 'oldest' })
  assert.equal(oldest.items[0].sourceUrl, 'https://example.org/b')
  assert.equal((await getNews({ query: '과학' })).total, 1)
  const personalized = await getNews({ topics: ['technology'], limit: 1 })
  assert.equal(personalized.total, 1)
  assert.equal(personalized.items[0].sourceUrl, 'https://example.org/b')
  assert.equal(calls, 1, 'cached metadata serves search and sorting without extra provider requests')
})

test('news service errors are surfaced instead of returning example articles', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Rate limit', { status: 429 }))
  await assert.rejects(getNews({ topic: 'health' }), { code: 'NEWS_UNAVAILABLE' })
})

const comparisonArticle = { title: '수능 통신 차단 한계', sourceUrl: 'https://www.mk.co.kr/news/test', topicId: 'economy', publishedAt: '2026-11-16T10:00:00Z' }
const comparisonQueries = [{ ko: '수능 부정행위 대책', en: 'CSAT cheating measures' }, { ko: '수능 통신 차단 효과', en: 'CSAT communication blocking' }]
function naverEnvironment(context) {
  const old = { id: process.env.NAVER_CLIENT_ID, secret: process.env.NAVER_CLIENT_SECRET }
  process.env.NAVER_CLIENT_ID = 'test-client'
  process.env.NAVER_CLIENT_SECRET = 'test-secret'
  context.after(() => {
    if (old.id === undefined) delete process.env.NAVER_CLIENT_ID; else process.env.NAVER_CLIENT_ID = old.id
    if (old.secret === undefined) delete process.env.NAVER_CLIENT_SECRET; else process.env.NAVER_CLIENT_SECRET = old.secret
  })
}
test('comparison searches the issue across sections and diversifies publishers', async context => {
  naverEnvironment(context)
  const urls = []
  context.mock.method(globalThis, 'fetch', async value => {
    const url = new URL(value); urls.push(url)
    return new Response(JSON.stringify({ items: [
      { title: '수능 부정행위 대책', originallink: 'https://m.mk.co.kr/a', pubDate: '2026-11-16' },
      { title: '수능 감독 대책의 효과', originallink: 'https://www.hani.co.kr/a', pubDate: '2026-11-16' },
      { title: '수능 통신 대책의 효과', originallink: 'https://www.hani.co.kr/b', pubDate: '2026-11-16' },
      { title: '수능 부정행위와 대응', originallink: 'https://news.kbs.co.kr/a', pubDate: '2026-11-16' },
      { title: '지난해 수능 부정행위 대책', originallink: 'https://example.org/old', pubDate: '2025-11-16' },
      { title: '다른 사건', originallink: 'https://example.net/irrelevant', pubDate: '2026-11-16' },
    ] }))
  })
  const result = await relatedCandidates(comparisonArticle, ['수능', '부정행위'], { queries: comparisonQueries })
  assert.deepEqual(urls.map(url => url.searchParams.get('query')), comparisonQueries.map(query => query.ko))
  assert.ok(urls.every(url => url.searchParams.get('sort') === 'sim'))
  assert.deepEqual(result.items.map(item => publisherKey(item.sourceUrl)), ['hani.co.kr', 'news.kbs.co.kr', 'hani.co.kr'])
  assert.equal(result.partial, false)
})

test('GDELT comparison searches English issue terms and the article date window', async context => {
  let requested
  context.mock.method(globalThis, 'fetch', async value => {
    requested = new URL(value)
    return new Response(JSON.stringify({ articles: [{ title: '수능 부정행위 감독 대책', url: 'https://www.hani.co.kr/gdelt', seendate: '20261116T090000Z' }] }))
  })
  const result = await relatedCandidates(comparisonArticle, ['수능'], { queries: comparisonQueries })
  const query = requested.searchParams.get('query')
  assert.match(query, /"csat"/)
  assert.match(query, /sourcelang:korean/)
  assert.doesNotMatch(query, /economy|finance/)
  assert.ok(requested.searchParams.has('startdatetime'))
  assert.equal(result.items.length, 1)
})

test('comparison reports provider failure and honors cancellation instead of claiming no articles exist', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }))
  await assert.rejects(relatedCandidates(comparisonArticle, ['수능'], { queries: comparisonQueries }), { code: 'COMPARISON_SEARCH_UNAVAILABLE' })
  const controller = new AbortController(); controller.abort()
  await assert.rejects(relatedCandidates(comparisonArticle, ['수능'], { queries: comparisonQueries, signal: controller.signal }), { name: 'AbortError' })
})

test('Naver failure can fall back to issue search without losing the partial result', async context => {
  naverEnvironment(context)
  context.mock.method(globalThis, 'fetch', async value => new URL(value).hostname === 'openapi.naver.com'
    ? new Response('unavailable', { status: 503 })
    : new Response(JSON.stringify({ articles: [{ title: '수능 부정행위 대응', url: 'https://www.hani.co.kr/fallback', seendate: '20261116T090000Z' }] })))
  const result = await relatedCandidates(comparisonArticle, ['수능'], { queries: comparisonQueries })
  assert.equal(result.items.length, 1)
  assert.equal(result.partial, true)
})
