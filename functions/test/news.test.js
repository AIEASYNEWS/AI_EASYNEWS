import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNaverHubNews, parseRssFeed, publisherKey } from '../src/news.js'

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

test('publisher keys group subdomains without merging unrelated domains', () => {
  assert.equal(publisherKey('https://m.mk.co.kr/news/1'), 'mk.co.kr')
  assert.equal(publisherKey('https://news.example.co.kr/a'), 'example.co.kr')
  assert.notEqual(publisherKey('https://www.hani.co.kr/a'), publisherKey('https://www.donga.com/a'))
})
