import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseArticleHtml } from '../src/articles.js'
import { rewriteArticle } from '../src/ai.js'
import { buildComparison } from '../src/comparison.js'

process.env.MONOROUTER_API_KEY = 'test-only-key'
process.env.MONOROUTER_MODEL = 'test-text-model'
delete process.env.NAVER_CLIENT_ID
delete process.env.NEWS_RSS_FEEDS

const aiResponse = value => Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] })
const articleHtml = (lang, title, text) => `<html lang="${lang}"><head><title>${title}</title></head><body><article><h1>${title}</h1><p>${text}</p></article></body></html>`
const originalQuote = 'The council says the new timetable will shorten the journey for commuters.'
const original = parseArticleHtml(articleHtml('en-GB', 'Council explains rail timetable',
  originalQuote + ' The timetable for the North Line is due to take effect in the spring, after a public consultation.'),
'https://city.example/news/timetable')
const rewrite = {
  easyTitle: '시의회가 열차 시간표를 설명했어요', easyParagraphs: ['시의회는 새 시간표로 통근 시간이 줄어들 것으로 봐요.'],
  summary: ['새 시간표는 봄에 적용할 예정이에요.'], keywords: ['북부 노선'], topicId: 'society',
  comparisonQueries: [{ ko: '북부 노선 통근자 반박', en: 'North Line commuters' }],
}

test('an English article yields Korean reading text and a verified opposing story with a Japanese headline', async context => {
  const quote = '利用者団体は、新しい時刻表では通勤時間がかえって長くなると指摘した。'
  const other = parseArticleHtml(articleHtml('ja', '利用者団体が時刻表に異議', quote + '利用者団体は、朝の乗り換え時間を考慮するよう市議会に申し入れた。'.repeat(4)), 'https://transit.example/articles/1')
  let aiCalls = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    const endpoint = new URL(url)
    if (endpoint.hostname === 'www.bing.com') return new Response('<rss><channel><title>News</title></channel></rss>')
    if (endpoint.hostname === 'api.gdeltproject.org') {
      assert.doesNotMatch(endpoint.searchParams.get('query'), /sourcelang:/)
      return Response.json({ articles: [{ title: other.title, url: other.sourceUrl }] })
    }
    assert.equal(endpoint.hostname, 'monogpt.kr')
    aiCalls++
    if (aiCalls === 1) return aiResponse(rewrite)
    assert.ok(init.body.includes(quote))
    return aiResponse({ originalFocus: '통근 시간 단축', reports: [{
      id: other.id, koreanTitle: '이용자 단체가 새 시간표에 이의를 제기했어요', relation: 'opposing', kind: 'different-perspective',
      focus: '시의회는 통근 시간이 줄어든다고 봤고, 이용자 단체는 오히려 늘어난다고 지적했어요.',
      summary: ['이용자 단체는 새 시간표대로라면 통근 시간이 더 걸린다고 말했어요.', '시의회에 아침 환승 시간도 고려해 달라고 요청했어요.'],
      viewpoint: '통근 시간', originalEvidence: originalQuote, relatedEvidence: quote,
    }] })
  })
  const translated = await rewriteArticle(original)
  assert.deepEqual(translated.easyParagraphs, rewrite.easyParagraphs)
  assert.deepEqual(translated.summary, rewrite.summary)
  assert.equal(original.sourceLanguage, 'en')
  assert.ok(original.originalParagraphs[0].includes(originalQuote))
  const compared = await buildComparison(original, translated.keywords, {
    queries: translated.comparisonQueries,
    articleReader: async url => { assert.equal(url, other.sourceUrl); return other },
  })
  assert.equal(compared.comparisonStatus, 'ready')
  assert.equal(compared.reports[0].relation, 'opposing')
  assert.equal(compared.reports[0].sourceUrl, other.sourceUrl)
  assert.match(compared.reports[0].koreanTitle, /이용자/)
  assert.equal(compared.reports[0].relatedEvidence, quote)
  assert.equal(compared.reports[0].summary.length, 2)
})

test('untranslated output is retried once and never saved as a Korean result', async context => {
  let calls = 0
  context.mock.method(globalThis, 'fetch', async () => {
    calls++
    return aiResponse({ ...rewrite, summary: ['The new timetable begins in spring.'] })
  })
  await assert.rejects(rewriteArticle(original), { code: 'AI_INVALID_RESPONSE' })
  assert.equal(calls, 2)
})
