import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS, isRegion, normalizeRegion, regionQuery } from '../src/regions.js'
import { pickSimilar, similarQuery } from '../src/similar.js'
import { extractImage } from '../src/images.js'

test('the region list covers every 시·도 and validates 시·군·구', () => {
  assert.equal(REGIONS.length, 17)
  assert.ok(isRegion({ sido: '경상북도', sigungu: '경산시' }))
  assert.ok(isRegion({ sido: '인천광역시', sigungu: '검단구' }))
  assert.equal(isRegion({ sido: '경상북도', sigungu: '해운대구' }), false)
})

test('AI-written places normalize to official names and ambiguous names need the 시·도', () => {
  assert.equal(normalizeRegion('경북 경산시'), '경상북도 경산시')
  assert.equal(normalizeRegion('경산'), '경상북도 경산시')
  assert.equal(normalizeRegion('대구 중구'), '대구광역시 중구')
  assert.equal(normalizeRegion('중구'), null)
  assert.equal(normalizeRegion('강원도'), null)
  assert.equal(normalizeRegion('강원 춘천시'), '강원특별자치도 춘천시')
  assert.equal(regionQuery({ sido: '대구광역시', sigungu: '중구' }), '대구 중구')
  assert.equal(regionQuery({ sido: '경상북도', sigungu: '경산시' }), '경산시')
})

test('similar stories come from other publishers about the same subject within a week', () => {
  const item = { newsKey: 'a'.repeat(32), title: '청년 일경험 지원사업 내년 확대', sourceUrl: 'https://saenal.example/1', publishedAt: '2026-11-20T00:00:00Z',
    tags: { keywords: ['일경험', '참여 수당', '고용노동부'] } }
  assert.equal(similarQuery(item), '일경험 참여 수당 고용노동부')
  const result = (title, url, publishedAt = '2026-11-20T03:00:00Z', excerpt = '') => ({ title, sourceUrl: url, publisher: new URL(url).hostname, publishedAt, excerpt })
  const picked = pickSimilar(item, [
    result('청년 일경험 지원사업 확대 (같은 언론사)', 'https://saenal.example/2'),
    result('일경험 수당은 그대로… 예산 부족 우려', 'https://hanbit.example/1'),
    result('일경험 참여 수당 두 번째 기사', 'https://hanbit.example/2'),
    result('작년 일경험 사업 결과', 'https://pureun.example/old', '2026-10-01T00:00:00Z'),
    result('프로야구 개막', 'https://sports.example/1'),
    result('대학가 반응', 'https://onnuri.example/1', '2026-11-20T05:00:00Z', '일경험 신청 방법을 정리했다.'),
  ])
  assert.deepEqual(picked.map(story => story.sourceUrl), ['https://hanbit.example/1', 'https://onnuri.example/1'])
})

test('representative images come from og/twitter meta tags and must be public https URLs', () => {
  assert.equal(extractImage('<meta property="og:image" content="https://cdn.example/a.jpg?w=1&amp;h=2">', 'https://news.example/1'), 'https://cdn.example/a.jpg?w=1&h=2')
  assert.equal(extractImage('<meta content="/img/b.png" name="twitter:image">', 'https://news.example/1'), 'https://news.example/img/b.png')
  assert.equal(extractImage('<meta property="og:image" content="http://127.0.0.1/x.png">', 'https://news.example/1'), null)
  assert.equal(extractImage('<title>no image</title>', 'https://news.example/1'), null)
})
