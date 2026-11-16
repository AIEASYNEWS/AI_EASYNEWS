import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNews, parseRssFeed } from '../src/news.js'

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
