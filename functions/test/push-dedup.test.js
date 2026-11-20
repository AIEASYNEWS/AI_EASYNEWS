import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Firestore } from 'firebase-admin/firestore'
import { newsIdentity, readStoredNews, storeNewsCandidates, topicNews, uniqueNews } from '../src/newsCatalog.js'
import { reservePush } from '../src/push.js'
import { collectNews, getExploreNews } from '../src/news.js'

// Use SDK document paths with serialized in-memory transactions. No FCM send or network access.
function fixture() {
  const refs = new Firestore({ projectId: 'demo-ai-easynews' })
  const docs = new Map()
  const snapshot = ref => ({
    ref, id: ref.id, exists: docs.has(ref.path), data: () => docs.get(ref.path), get: field => docs.get(ref.path)?.[field],
  })
  const tx = {
    getAll: async (...refs) => refs.map(snapshot),
    set: (ref, value) => docs.set(ref.path, value),
    create: (ref, value) => { assert.ok(!docs.has(ref.path)); docs.set(ref.path, value) },
    update: (ref, value) => { assert.ok(docs.has(ref.path)); docs.set(ref.path, { ...docs.get(ref.path), ...value }) },
  }
  let queue = Promise.resolve()
  const db = { collection: name => refs.collection(name), runTransaction: work => (queue = queue.then(() => work(tx))) }
  const ref = db.collection('pushDevices').doc('device')
  docs.set(ref.path, { uid: 'reader', since: 0 })
  return { db, device: snapshot(ref), docs }
}

const minute = 60000
const now = Date.parse('2026-11-20T06:00:00Z')
const article = { sourceUrl: 'https://news.example/story?id=42', title: '열차 시간표 변경', publisher: '신문',
  excerpt: '다음 주부터 첫차와 막차의 운행 시간이 함께 바뀝니다.', publishedAt: new Date(now - minute).toISOString() }

test('scheduled HUB collection persists once, then Explore and topic feeds read the catalog offline', async context => {
  const { db, docs } = fixture()
  const collection = db.collection
  db.collection = name => {
    const ref = collection(name)
    if (name === 'newsArticles') {
      ref.orderBy = (field, direction) => {
        assert.deepEqual([field, direction], ['publishedAt', 'desc'])
        return { limit: count => ({ get: async () => ({ docs: [...docs.entries()]
          .filter(([path]) => path.startsWith('newsArticles/')).map(([, item]) => item)
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, count).map(item => ({ data: () => item })) }) }) }
      }
    }
    return ref
  }
  const previous = process.env
  process.env = { ...previous, NAVER_API_HUB_CLIENT_ID: 'hub-id', NAVER_API_HUB_CLIENT_SECRET: 'hub-secret' }
  context.after(() => { process.env = previous })
  let requests = 0
  const upstream = context.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url.searchParams.get('sort'), 'date')
    assert.equal(url.searchParams.get('display'), '35')
    requests++
    const topic = url.searchParams.get('query')
    return Response.json({ items: Array.from({ length: 5 }, (_, i) => ({
      title: topic + ' ' + i, description: '청년월세 신청', link: 'https://news.example/' + encodeURIComponent(topic) + '/' + i,
      pubDate: new Date(now - i * minute).toISOString(),
    })) })
  })
  const offline = { imageLimit: 0, regions: async () => [] }
  await collectNews(db, offline)
  await collectNews(db, offline)
  assert.equal(requests, 18)
  upstream.mock.mockImplementation(() => { throw Error('request-time provider call') })
  const load = () => readStoredNews(db)
  const page = await getExploreNews({}, load)
  assert.equal(page.total, 45)
  assert.equal(page.items.length, 24)
  const next = await getExploreNews({ page: 2 }, load)
  assert.equal(next.items.length, 21)
  assert.equal(next.hasMore, false)
  const filtered = await getExploreNews({ topic: 'economy', query: '청년 월세', sort: 'oldest' }, load)
  assert.equal(filtered.total, 5)
  assert.equal(filtered.items[0].title, '경제 정책 4')
  const feed = await topicNews(['economy', 'culture'], load)
  assert.equal(feed.items.length, 10)
  assert.deepEqual(new Set(feed.items.map(item => item.topicId)), new Set(['economy', 'culture']))
  assert.equal(upstream.mock.callCount(), 18)
})

test('tracking variants share a key, article query IDs remain distinct, independent outlets remain separate', () => {
  const tracked = { ...article, sourceUrl: 'https://news.example/story?utm_source=mail&id=42#text' }
  const different = { ...article, sourceUrl: 'https://news.example/story?id=43' }
  const otherOutlet = { ...article, sourceUrl: 'https://other.example/story' }
  assert.equal(newsIdentity(article).newsKey, newsIdentity(tracked).newsKey)
  assert.notEqual(newsIdentity(article).newsKey, newsIdentity(different).newsKey)
  assert.equal(uniqueNews([article, tracked, different, otherOutlet]).length, 2)
  assert.equal(uniqueNews([article, { ...different, excerpt: '' }]).length, 2)
})

test('unchanged fetches keep the stored document, updated metadata replaces the same key', async () => {
  const { db, docs } = fixture()
  const [first] = await storeNewsCandidates(db, [article], now)
  const [unchanged] = await storeNewsCandidates(db, [{ ...article, sourceUrl: article.sourceUrl + '&fbclid=123' }], now + minute)
  assert.equal(unchanged.updatedAt, now)
  const [updated] = await storeNewsCandidates(db, [{ ...article, title: '수정한 제목' }], now + 2 * minute)
  assert.equal(updated.newsKey, first.newsKey)
  assert.equal(updated.firstSeenAt, now)
  assert.equal(updated.updatedAt, now + 2 * minute)
  assert.equal([...docs.keys()].filter(path => path.startsWith('newsArticles/')).length, 1)
})

test('overlapping checks, changed publication dates and alias URLs cannot repeat a push after the cooldown', async () => {
  const { db, device } = fixture()
  const claim = (items, time) => reservePush(db, device, {}, uniqueNews(items), time)
  const first = await Promise.all([claim([article], now), claim([article], now)])
  assert.equal(first.filter(Boolean).length, 1)
  const next = { ...article, title: '환승 안내', sourceUrl: 'https://news.example/new', publishedAt: new Date(now + minute).toISOString() }
  assert.equal(await claim([next], now + 5 * minute), null)
  const revised = { ...article, publishedAt: next.publishedAt, title: '제목 수정' }
  const mirrored = { ...article, sourceUrl: 'https://news.example/mirror' }
  assert.equal(await claim([revised, mirrored], now + 30 * minute), null)
  assert.equal((await claim([revised, mirrored, next], now + 30 * minute)).item.title, next.title)
})
