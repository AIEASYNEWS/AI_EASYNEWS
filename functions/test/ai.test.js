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

test('comparison retains only distinct perspectives grounded in both article bodies', async context => {
  const valid = { id: 'real', focus: '원문은 금리 유지, 비교 기사는 대출 부담을 설명해요.', kind: 'different-perspective', viewpoint: '대출자 영향', originalEvidence: article.originalParagraphs[0], relatedEvidence: '대출자들은 이자 부담이 계속된다고 설명했습니다.' }
  const related = { ...article, id: 'real', publisher: '실제 언론사', sourceUrl: 'https://example.org/news', originalParagraphs: [valid.relatedEvidence] }
  context.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.match(init.body, /같은 사실·논조를 반복/)
    assert.match(init.body, /긍정·부정을 억지로/)
    return aiResponse({ originalFocus: '기준금리 유지 결정', reports: [
      { ...valid, id: 'invented', focus: '제공되지 않은 기사의 주장은 제거되어야 합니다.' },
      valid, { ...valid, id: 'real', focus: '중복 인용' },
    ] })
  })
  const result = await compareArticles(article, [related])
  assert.deepEqual(result.reports.map(report => report.id), ['real'])
  assert.equal(result.reports[0].sourceUrl, related.sourceUrl)
  assert.equal(result.reports[0].relatedEvidence, valid.relatedEvidence)
  assert.equal(result.comparison, valid.focus)
  assert.doesNotMatch(result.comparison, /제공되지 않은|중복/)
})

test('same framing, same publisher and fabricated evidence cannot become an alternative viewpoint', async context => {
  const report = { focus: '관점 차이', kind: 'different-perspective', viewpoint: '대응 효과', originalEvidence: article.originalParagraphs[0], relatedEvidence: '대출자들은 이자 부담이 계속된다고 설명했습니다.' }
  const related = [
    { ...article, id: 'same-source', sourceUrl: 'https://www.example.com/other' },
    { ...article, id: 'fabricated', sourceUrl: 'https://example.net/other' },
    { ...article, id: 'same-framing', sourceUrl: 'https://example.org/other' },
  ]
  context.mock.method(globalThis, 'fetch', async () => aiResponse({ originalFocus: '유지 결정', reports: [
    { ...report, id: 'same-source', relatedEvidence: article.originalParagraphs[0] },
    { ...report, id: 'fabricated' },
    { ...report, id: 'same-framing', kind: 'same-event', relatedEvidence: article.originalParagraphs[0] },
  ] }))
  const result = await compareArticles(article, related)
  assert.deepEqual(result.reports, [])
  assert.equal(result.comparison, '')
  assert.equal(result.originalFocus, '')
})

test('no comparison bodies means no AI call', async context => {
  const mock = context.mock.method(globalThis, 'fetch', () => { throw new Error('must not call AI') })
  assert.deepEqual((await compareArticles(article, [])).reports, [])
  assert.equal(mock.mock.callCount(), 0)
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
