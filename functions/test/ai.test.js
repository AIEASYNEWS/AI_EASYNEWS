import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteArticle, chatAnswer, assertAiConfigured, OFF_TOPIC_ANSWER } from '../src/ai.js'

const article = { title: '기준금리 결정', sourceUrl: 'https://example.com/news', originalParagraphs: ['중앙은행이 기준금리를 유지했습니다.'], easyParagraphs: ['은행의 기준이 되는 금리가 그대로예요.'] }
process.env.MONOROUTER_API_KEY = 'test-only-key'
process.env.MONOROUTER_MODEL = 'test-text-model'
function aiResponse(value, status = 200) { return new Response(JSON.stringify({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) }, finish_reason: 'stop' }] }), { status }) }
const rewritten = { easyTitle: '금리가 그대로예요', easyParagraphs: ['금리를 **그대로** 두기로 했어요.'], summary: ['금리를 유지했어요.', '대출 이자도 그대로예요.', '다음 결정은 1월이에요.'], keywords: ['금리'], topicId: 'economy' }
const explained = { background: '기준금리는 은행 이자의 기준이에요.', glossary: [{ term: '기준금리', meaning: '은행 이자를 정하는 기준이 되는 금리예요.' }], changedCount: 3 }

test('rewrite combines the easy body with background and glossary, reporting both stages', async context => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test-only-key')
    assert.match(init.body, /중앙은행/)
    return aiResponse(init.body.includes('배경') && init.body.includes('glossary') ? explained : rewritten)
  })
  const stages = []
  const result = await rewriteArticle(article, undefined, step => stages.push(step))
  assert.equal(result.topicId, 'economy')
  assert.equal(result.summary.length, 3)
  assert.equal(result.background, explained.background)
  assert.deepEqual(result.glossary, explained.glossary)
  assert.equal(result.changedCount, 3)
  assert.deepEqual(stages, [3])
})

test('a failed explanation keeps the rewritten body; a malformed body or credit error fails honestly', async context => {
  const mock = context.mock.method(globalThis, 'fetch', async (_url, init) => init.body.includes('glossary') ? aiResponse('not json') : aiResponse(rewritten))
  const result = await rewriteArticle(article)
  assert.equal(result.background, '')
  assert.deepEqual(result.glossary, [])
  mock.mock.mockImplementation(async () => aiResponse({ easyTitle: '불완전한 응답' }))
  await assert.rejects(rewriteArticle(article), { code: 'AI_INVALID_RESPONSE' })
  mock.mock.mockImplementation(async () => new Response('private provider detail', { status: 402 }))
  await assert.rejects(rewriteArticle(article), { code: 'AI_CREDITS_EXHAUSTED' })
})

test('chat answers use the article, quote and history, and decline unrelated questions', async context => {
  let body = ''
  const mock = context.mock.method(globalThis, 'fetch', async (_url, init) => { body = init.body; return aiResponse({ offTopic: false, answer: '금리를 그대로 둔다는 뜻이에요.' }) })
  const history = [{ role: 'user', text: '무슨 뜻이야?' }, { role: 'assistant', text: '금리 이야기예요.' }]
  const reply = await chatAnswer({ title: article.title, context: article.originalParagraphs.join('\n') }, history, { quote: '기준금리를 유지', question: '쉽게 설명해 줘' })
  assert.deepEqual(reply, { offTopic: false, answer: '금리를 그대로 둔다는 뜻이에요.' })
  assert.match(body, /기준금리를 유지/)
  assert.match(body, /금리 이야기예요/)
  mock.mock.mockImplementation(async () => aiResponse({ offTopic: true, answer: '짜장면 어때요?' }))
  assert.deepEqual(await chatAnswer({ title: 't', context: 'c' }, [], { question: '점심 메뉴 추천해 줘' }), { offTopic: true, answer: OFF_TOPIC_ANSWER })
  mock.mock.mockImplementation(async () => aiResponse('그냥 문장으로 답했어요.'))
  assert.equal((await chatAnswer({ title: 't', context: 'c' }, [], { question: '뜻이 뭐야?' })).answer, '그냥 문장으로 답했어요.')
})

test('credentials are restricted to the intended provider origin', () => {
  process.env.MONOROUTER_BASE_URL = 'https://example.com/api/monorouter/v1'
  try { assert.throws(assertAiConfigured, { code: 'AI_CONFIGURATION_ERROR' }) }
  finally { delete process.env.MONOROUTER_BASE_URL }
})
