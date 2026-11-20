import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNaverHubNews, parseRssFeed, relatedCandidates, publisherKey } from '../src/news.js'

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

test('NAVER API HUB returns topic news in provider order with original article links', async context => {
  const originalLink = 'https://www.donga.com/news/article/one?src=example#article'
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin + url.pathname, 'https://naverapihub.apigw.ntruss.com/search/v1/news')
    assert.deepEqual(Object.fromEntries(url.searchParams), { query: '경제 정책', display: '10', sort: 'date', format: 'json' })
    assert.deepEqual(options.headers, { 'X-NCP-APIGW-API-KEY-ID': 'test-id', 'X-NCP-APIGW-API-KEY': 'test-secret' })
    assert.equal(options.redirect, 'error')
    return Response.json({ items: [
      { title: '<b>경제</b> 소식', originallink: originalLink, link: 'https://n.news.naver.com/one', pubDate: '2026-11-17' },
      { title: '경제 정책', link: 'https://www.kmib.co.kr/article/two', pubDate: '2026-11-18' },
    ] })
  })

  const news = await getNaverHubNews('economy', { clientId: 'test-id', clientSecret: 'test-secret' })
  assert.equal(news.source, 'naver-hub')
  assert.deepEqual(news.items.map(({ title, publisher, sourceUrl, topicId }) => ({ title, publisher, sourceUrl, topicId })), [
    { title: '경제 소식', publisher: '동아일보', sourceUrl: originalLink, topicId: 'economy' },
    { title: '경제 정책', publisher: '국민일보', sourceUrl: 'https://www.kmib.co.kr/article/two', topicId: 'economy' },
  ])
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

test('a focused second query reaches the reading budget despite many similar outlets', async context => {
  naverEnvironment(context)
  context.mock.method(globalThis, 'fetch', async value => {
    const counterpoint = new URL(value).searchParams.get('query').includes('주민')
    const items = counterpoint ? [{ title: '시험장 주민 반박', originallink: 'https://resident.example/report' }]
      : Array.from({ length: 16 }, (_, i) => ({ title: '시험장 차단 대책 감독 교육청', originallink: `https://outlet${i}.example/report` }))
    return Response.json({ items })
  })
  const found = await relatedCandidates(comparisonArticle, ['시험장', '차단', '교육청', '감독'], {
    queries: [{ ko: '시험장 차단 대책', en: '' }, { ko: '시험장 주민 반박', en: '' }],
  })
  assert.equal(found.items[1].sourceUrl, 'https://resident.example/report')
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

test('foreign news RSS exposes the publisher link even when GDELT is unavailable and site language metadata is wrong', async context => {
  context.mock.method(globalThis, 'fetch', async value => {
    const url = new URL(value)
    if (url.hostname !== 'www.bing.com') return new Response('unavailable', { status: 503 })
    if (url.searchParams.get('setlang') === 'ko-kr') return new Response('<rss><channel><title>뉴스</title></channel></rss>')
    assert.equal(url.searchParams.get('q'), 'North Line commuters')
    return new Response('<rss><channel><item><title>北線の新時刻表</title><link>http://www.bing.com/news/apiclick.aspx?ref=Rss&amp;url=https%3A%2F%2Ftransit.example%2Farticle</link></item></channel></rss>')
  })
  const result = await relatedCandidates({ ...comparisonArticle, sourceLanguage: 'ko', originalParagraphs: ['The council will change train schedules.'] }, ['통근'], {
    queries: [{ ko: '북부 철도 통근', en: 'North Line commuters' }],
  })
  assert.deepEqual(result.items.map(item => item.sourceUrl), ['https://transit.example/article'])
  assert.equal(result.partial, true)
})
