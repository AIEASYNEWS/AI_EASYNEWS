import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFeed, scoreMatch, similarArticles, grade, weightKeys, tagArticles } from '../src/matching.js'

const now = Date.parse('2026-11-20T03:00:00Z')
const hoursAgo = hours => new Date(now - hours * 3600_000).toISOString()
const reader = { topicIds: ['jobs', 'youth', 'technology'], customKeywords: ['장학금'], ageGroup: 'early20s', occupation: 'university', keywordWeights: {} }
const youthJob = {
  newsKey: 'a'.repeat(32), title: '청년 일경험 지원사업 내년 확대… 졸업 예정 4학년도 신청 가능', excerpt: '참여 수당은 월 단위로 지급된다.',
  topicId: 'youth', publisher: '새날경제', sourceUrl: 'https://saenal.example/news/1', publishedAt: hoursAgo(0.5),
  tags: { topics: ['jobs', 'youth'], keywords: ['일경험', '참여 수당'], ages: ['early20s', 'late20s'], occupations: ['university', 'jobseeker'], difficult: true, why: '졸업 예정 4학년도 신청할 수 있어요' },
}

test('scores interests 50 + age/occupation 30 + timeliness 20 and lists the matched conditions', () => {
  const match = scoreMatch(reader, youthJob, now)
  assert.deepEqual([match.interest, match.personal, match.timeliness], [38, 30, 20])
  assert.equal(match.score, 88)
  assert.equal(match.grade, '잘 맞아요')
  assert.deepEqual(match.matchedTags, ['#취업', '#청년정책', '#20대', '#대학생'])
  const keyword = scoreMatch(reader, { ...youthJob, title: '국가장학금 2학기 신청 다음 주 마감' }, now)
  assert.equal(keyword.interest, 50)
  assert.ok(keyword.matchedTags.includes('#장학금'))
})

test('readers without interests or profile, and untagged stories, get neutral partial scores', () => {
  const match = scoreMatch({ topicIds: [], customKeywords: [] }, { ...youthJob, tags: undefined }, now)
  assert.equal(match.interest, 0)
  assert.equal(match.personal, 16)
  assert.equal(grade(59), '조금 맞아요')
})

test('feedback weights move the interest score within ±8 and a disliked story leaves the feed', () => {
  const keys = weightKeys(youthJob)
  assert.deepEqual(keys, ['topic:jobs', 'kw:일경험', 'kw:참여수당'])
  const liked = scoreMatch({ ...reader, keywordWeights: Object.fromEntries(keys.map(key => [key, 3])) }, youthJob, now)
  assert.equal(liked.interest, 46)
  const feed = buildFeed(reader, [youthJob], { now, feedback: { [youthJob.newsKey]: 'bad' } })
  assert.equal(feed.total, 1)
  assert.equal(feed.items.length, 0)
})

test('the feed counts the last 24 hours and lists only stories of 60% or more, best first', () => {
  const weak = { ...youthJob, newsKey: 'b'.repeat(32), title: '주말 날씨 맑음', excerpt: '', topicId: 'lifestyle', tags: { ...youthJob.tags, topics: ['lifestyle'], keywords: ['날씨'], ages: ['fiftyPlus'], occupations: ['employee'] } }
  const older = { ...youthJob, newsKey: 'c'.repeat(32), publishedAt: hoursAgo(30) }
  const second = { ...youthJob, newsKey: 'd'.repeat(32), publishedAt: hoursAgo(10), tags: { ...youthJob.tags, ages: ['all'] } }
  const feed = buildFeed(reader, [weak, older, second, youthJob], { now })
  assert.equal(feed.total, 3)
  assert.deepEqual(feed.items.map(item => item.id), [youthJob.newsKey, second.newsKey])
  assert.equal(feed.items[0].why, youthJob.tags.why)
  assert.equal(feed.items[0].match.score, 88)
})

test('similar stories come from other publishers and share the subject', () => {
  const sameOutlet = { ...youthJob, newsKey: 'e'.repeat(32), title: '일경험 수당 논란', sourceUrl: 'https://saenal.example/news/2' }
  const other = { ...youthJob, newsKey: 'f'.repeat(32), title: '일경험 수당은 그대로… 예산 부족 우려', publisher: '한빛일보', sourceUrl: 'https://hanbit.example/1', tags: { ...youthJob.tags, why: '수당 수준과 예산 문제를 짚었어요' } }
  const unrelated = { ...youthJob, newsKey: '1'.repeat(32), title: '프로야구 개막', publisher: '스포츠', sourceUrl: 'https://sports.example/1', topicId: 'culture', tags: { ...youthJob.tags, topics: ['culture'], keywords: ['야구'] } }
  assert.deepEqual(similarArticles(youthJob, [youthJob, sameOutlet, other, unrelated]).map(item => [item.id, item.excerpt]), [[other.newsKey, '수당 수준과 예산 문제를 짚었어요']])
})

test('AI tags are validated per article and unknown ids are dropped', async context => {
  process.env.MONOROUTER_API_KEY = 'test-only-key'
  process.env.MONOROUTER_MODEL = 'test-text-model'
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items: [
    { id: youthJob.newsKey, topics: ['youth'], keywords: ['일경험'], ages: ['early20s'], occupations: ['university'], difficult: true, why: '신청할 수 있어요' },
    { id: 'unknown', topics: ['jobs'], ages: ['all'], occupations: ['all'], difficult: false },
    { id: youthJob.newsKey, topics: ['not-a-topic'] },
  ] }) }, finish_reason: 'stop' }] })))
  const tags = await tagArticles([youthJob])
  assert.equal(tags.size, 1)
  assert.deepEqual(tags.get(youthJob.newsKey).topics, ['youth'])
})
