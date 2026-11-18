import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildComparison } from '../src/comparison.js'

const original = { id: 'original', title: '수능 부정행위 대책', sourceUrl: 'https://www.mk.co.kr/source', originalParagraphs: ['원문은 전파 차단의 한계를 설명합니다.'] }
const candidate = index => ({ id: String(index), sourceUrl: `https://publisher${index}.example/news`, originalParagraphs: [`감독 대책을 설명하는 비교 기사 ${index}의 본문입니다.`] })
test('failed article reads advance to later candidates and AI receives verified bodies', async () => {
  const attempted = []
  let analyzed
  const result = await buildComparison(original, ['수능'], {
    findRelated: async () => ({ items: Array.from({ length: 9 }, (_, index) => candidate(index)), partial: false }),
    articleReader: async url => {
      attempted.push(url)
      if (attempted.length <= 3) throw new Error('paywall')
      return candidate(Number(url.match(/publisher(\d+)/)[1]))
    },
    compare: async (_original, related) => {
      analyzed = related
      return { comparison: '대응 방식의 차이', reports: [{ id: related[0].id }] }
    },
  })
  assert.equal(attempted.length, 9)
  assert.equal(analyzed.length, 6)
  assert.equal(result.comparisonStatus, 'partial')
  assert.match(result.comparisonNotice, /일부 기사/)
})

test('search failure, no candidates, unreadable bodies and no distinct perspective have different outcomes', async () => {
  const cases = [
    { expected: 'search-unavailable', findRelated: async () => { throw new Error('provider down') } },
    { expected: 'no-candidates', findRelated: async () => [] },
    { expected: 'read-failed', findRelated: async () => [candidate(1)], articleReader: async () => { throw new Error('blocked') } },
    { expected: 'no-distinct-perspective', findRelated: async () => [candidate(1)], articleReader: async () => candidate(1), compare: async () => ({ reports: [], comparison: '' }) },
    { expected: 'analysis-failed', findRelated: async () => [candidate(1)], articleReader: async () => candidate(1), compare: async () => { throw new Error('AI down') } },
  ]
  for (const { expected, ...dependencies } of cases) {
    const result = await buildComparison(original, [], dependencies)
    assert.equal(result.comparisonStatus, expected)
    assert.ok(result.comparisonNotice)
    assert.deepEqual(result.reports, [])
  }
})

test('redirected same-publisher pages and duplicate bodies are removed before AI comparison', async () => {
  let analyzed
  const result = await buildComparison(original, [], {
    findRelated: async () => [candidate(1), candidate(2), candidate(3)],
    articleReader: async url => url.includes('publisher1')
      ? { ...candidate(1), sourceUrl: 'https://m.mk.co.kr/redirect' }
      : { ...candidate(2), sourceUrl: url },
    compare: async (_original, related) => { analyzed = related; return { comparison: '차이', reports: [{ id: related[0].id }] } },
  })
  assert.equal(analyzed.length, 1)
  assert.equal(result.comparisonStatus, 'ready')
})

test('user cancellation propagates rather than saving an empty comparison', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(buildComparison(original, [], {
    signal: controller.signal, findRelated: async () => [],
  }), { name: 'AbortError' })
})

test('an unverified comparison states the checked count and partial coverage', async () => {
  const result = await buildComparison(original, [], {
    findRelated: async () => ({ items: [candidate(1)], partial: true }),
    articleReader: async () => candidate(1),
    compare: async () => ({ reports: [], unverified: true }),
  })
  assert.equal(result.comparisonStatus, 'evidence-unverified')
  assert.match(result.comparisonNotice, /1건.*검증하지 못.*일부/)
})
