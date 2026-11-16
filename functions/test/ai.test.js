import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteArticle, compareArticles, answerQuestion, assertAiConfigured } from '../src/ai.js'

const article = { title: '기준금리 결정', sourceUrl: 'https://example.com/news', originalParagraphs: ['중앙은행이 기준금리를 유지했습니다.'], easyParagraphs: ['은행의 기준이 되는 금리가 그대로예요.'] }
process.env.MONOROUTER_API_KEY = 'test-only-key'
process.env.MONOROUTER_MODEL = 'test-text-model'
function aiResponse(value, status = 200) { return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }] }), { status }) }

test('rewrite validates provider JSON and uses a server credential', async context => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test-only-key')
    assert.match(init.body, /중앙은행/)
    return aiResponse({ easyTitle: '금리가 그대로예요', easyParagraphs: ['금리를 그대로 두기로 했어요.'], summary: ['금리를 유지했어요.'], keywords: ['금리'], topicId: 'economy' })
  })
  const result = await rewriteArticle(article)
  assert.equal(result.topicId, 'economy')
  assert.equal(result.summary.length, 1)
})

test('malformed AI output and provider credit errors fail honestly', async context => {
  const mock = context.mock.method(globalThis, 'fetch', async () => aiResponse({ easyTitle: '불완전한 응답' }))
  await assert.rejects(rewriteArticle(article), { code: 'AI_INVALID_RESPONSE' })
  mock.mock.mockImplementation(async () => new Response('private provider detail', { status: 402 }))
  await assert.rejects(rewriteArticle(article), { code: 'AI_CREDITS_EXHAUSTED' })
})

test('comparison discards citations that were not supplied by the server', async context => {
  context.mock.method(globalThis, 'fetch', async () => aiResponse({ comparison: '강조점 차이', reports: [{ id: 'invented', focus: '가짜 인용', kind: 'same-event' }, { id: 'real', focus: '경제 지표를 강조', kind: 'same-event' }] }))
  const result = await compareArticles(article, [{ ...article, id: 'real', publisher: '실제 언론사', sourceUrl: 'https://example.org/news' }])
  assert.deepEqual(result.reports.map(report => report.id), ['real'])
  assert.equal(result.reports[0].sourceUrl, 'https://example.org/news')
})

test('questions must refer to text found in the easy or original article', async context => {
  let requests = 0
  context.mock.method(globalThis, 'fetch', async () => { requests++; return new Response(JSON.stringify({ choices: [{ message: { content: '금리를 그대로 유지했다는 뜻이에요.' } }] })) })
  await assert.rejects(answerQuestion(article, '기사에 없는 문장', '설명해 줘'), { code: 'INVALID_SELECTION' })
  assert.equal(requests, 0)
  assert.match(await answerQuestion(article, article.originalParagraphs[0], '뜻이 뭐야?'), /금리/)
  assert.match(await answerQuestion(article, article.easyParagraphs[0], '설명해 줘'), /금리/)
})

test('credentials are restricted to the intended provider origin', () => {
  process.env.MONOROUTER_BASE_URL = 'https://example.com/api/monorouter/v1'
  try { assert.throws(assertAiConfigured, { code: 'AI_CONFIGURATION_ERROR' }) }
  finally { delete process.env.MONOROUTER_BASE_URL }
})
