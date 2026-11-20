import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { AppError } from '../functions/src/errors.js'

// This integration suite is fully offline: only loopback emulator/server sockets
// are allowed. Any attempted external connection fails before a socket opens.
const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const input = args[0]
  const options = Array.isArray(input) ? input[0] : input
  const host = typeof options === 'object' ? options.host || options.hostname : typeof args[1] === 'string' ? args[1] : 'localhost'
  if (host && !['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Offline integration test blocked external connection')
  return originalConnect.apply(this, args)
}

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.GCLOUD_PROJECT = 'demo-ai-easynews'
const { createApp } = await import('../functions/src/app.js')
const { getQuota, reserveConversion, usageDay } = await import('../functions/src/store.js')
const { adminServices } = await import('../functions/src/firebase.js')
let server, port, account, second
let rewriteShouldFail = false
const collectCalls = []
const expandCalls = []
const newsItem = { newsKey: 'c'.repeat(32), id: 'c'.repeat(32), title: '청년 일경험 지원사업 확대', excerpt: '졸업 예정자도 신청할 수 있다.', topicId: 'youth', publisher: '테스트', sourceUrl: 'https://example.com/test-article', publishedAt: new Date().toISOString(),
  tags: { topics: ['jobs', 'youth'], keywords: ['일경험'], ages: ['early20s'], occupations: ['university'], difficult: true, why: '졸업 예정자도 신청할 수 있어요' } }
const fixtureArticle = { id: 'b'.repeat(32), topicId: 'economy', title: '테스트 기사', easyTitle: '테스트 기사', publisher: '테스트', publishedAt: '', sourceUrl: 'https://example.com/test-article', excerpt: '테스트 본문', originalParagraphs: ['오프라인 통합 테스트를 위한 기사 본문입니다.'], easyParagraphs: [], summary: [], comparison: '', reports: [] }

function request(targetPort, path, body, token, method = body ? 'POST' : 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: targetPort, path, method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, res => {
      let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, data: res.headers['content-type']?.includes('text/event-stream') ? text : JSON.parse(text) }))
    }); req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined)
  })
}

before(async () => {
  process.env.MONOROUTER_API_KEY = 'offline-test-only'
  process.env.MONOROUTER_MODEL = 'offline-test-only'
  server = createApp({
    articleReader: async () => structuredClone(fixtureArticle),
    rewrite: async (_article, _signal, onStage) => {
      if (rewriteShouldFail) throw new AppError('AI_INVALID_RESPONSE', '테스트 실패', 502)
      onStage(3)
      return { easyTitle: '쉬운 제목', easyParagraphs: ['쉬운 본문'], summary: ['핵심 요약'], keywords: ['테스트'], topicId: 'economy', background: '배경', glossary: [], changedCount: 1 }
    },
    reason: async () => '취업 준비에 도움이 돼요.',
    answer: async (_article, history, { quote, question }) => question.includes('점심')
      ? { offTopic: true, answer: '뉴스·기사 관련 질문을 도와드려요.' }
      : { offTopic: false, answer: `답변 ${history.length}: ${quote || question}` },
    catalog: async () => ({ items: [newsItem] }),
    expand: async word => { expandCalls.push(word); return word.startsWith('백엔드') ? { meaningful: true, terms: ['일경험'] } : { meaningful: false, terms: [] } },
    imageReader: async () => 'https://cdn.example/test.jpg',
    collect: async (_db, options) => { collectCalls.push(options); return { stored: 1, tagged: 1, failedTopics: [] } },
  }).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  await adminServices().db.collection('newsArticles').doc(newsItem.newsKey).set(newsItem)
  port = server.address().port
  account = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { returnSecureToken: true })).data
  second = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { returnSecureToken: true })).data
})
after(async () => { await new Promise(resolve => server.close(resolve)); await adminServices().db.terminate(); net.Socket.prototype.connect = originalConnect })

test('scheduled collection requires the shared cron secret', async () => {
  delete process.env.CRON_SECRET
  assert.equal((await request(port, '/api/cron/collect', {})).status, 503)
  process.env.CRON_SECRET = 'offline-cron-secret'
  try {
    assert.equal((await request(port, '/api/cron/collect', {})).status, 401)
    assert.equal((await request(port, '/api/cron/collect', {}, 'wrong-secret')).status, 401)
    assert.equal(collectCalls.length, 0)
    const result = await request(port, '/api/cron/collect', {}, 'offline-cron-secret')
    assert.deepEqual(result.data, { stored: 1, tagged: 1, failedTopics: [] })
    assert.equal(collectCalls[0].tagLimit, 90)
    assert.ok(collectCalls[0].deadline > Date.now())
  } finally { delete process.env.CRON_SECRET }
})

test('requires real Firebase tokens and rejects untrusted origins', async () => {
  assert.equal((await request(port, '/api/profile')).status, 401)
  assert.equal((await request(port, '/api/profile', undefined, 'invalid-token')).status, 401)
  assert.equal((await request(port, '/api/profile', undefined, account.idToken)).status, 200)
  const quota = (await request(port, '/api/quota', undefined, account.idToken)).data
  assert.equal(quota.unlimited, true)
  assert.equal(quota.remaining, null)
  assert.equal(quota.subscriber, false)
})

test('profile schemas reject role escalation and invalid topics; profiles remain account-scoped', async () => {
  assert.equal((await request(port, '/api/profile', { topicIds: ['economy'], completed: true, role: 'admin' }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { topicIds: ['arbitrary'], completed: true }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { customKeywords: Array.from({ length: 11 }, (_, i) => '분야' + i) }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { ageGroup: 'early20s', gender: 'female', occupation: 'other', occupationOther: '휴학생', privacyConsent: false }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { topicIds: ['economy'], completed: true }, account.idToken, 'PUT')).status, 200)
  const saved = (await request(port, '/api/profile', { ageGroup: 'early20s', gender: 'female', occupation: 'university', occupationOther: '무시', privacyConsent: true, customKeywords: ['장학금'] }, account.idToken, 'PUT')).data
  assert.deepEqual([saved.topicIds, saved.ageGroup, saved.occupation, saved.occupationOther, saved.customKeywords], [['economy'], 'early20s', 'university', '', ['장학금']])
  assert.equal(saved.keywordWeights, undefined)
  assert.deepEqual((await request(port, '/api/profile', undefined, second.idToken)).data.topicIds, [])
})

test('nicknames are unique across members and guests cannot reserve one', async () => {
  const make = async name => (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { email: name + '@id.easynews.invalid', password: 'reader1234!', returnSecureToken: true })).data.idToken
  const stamp = Date.now().toString(36).slice(-5)
  const [first, other] = await Promise.all([make('nick1' + stamp), make('nick2' + stamp)])
  const nickname = '민서' + stamp.replace(/[^a-z0-9]/g, '').slice(0, 5)
  assert.equal((await request(port, '/api/profile', { nickname }, account.idToken, 'PUT')).status, 403)
  assert.equal((await request(port, '/api/auth/nickname?name=' + encodeURIComponent(nickname))).data.available, true)
  assert.equal((await request(port, '/api/profile', { nickname }, first, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/auth/nickname?name=' + encodeURIComponent(nickname))).data.available, false)
  const taken = await request(port, '/api/profile', { nickname: nickname.toUpperCase() }, other, 'PUT')
  assert.equal(taken.status, 409)
  assert.equal(taken.data.code, 'NICKNAME_TAKEN')
  assert.equal((await request(port, '/api/profile', { nickname: nickname + 'x' }, first, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/profile', { nickname }, other, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/auth/nickname?name=bad%20name')).status, 400)
})

test('the feed scores catalog stories per reader; feedback, bookmarks and reasons are private', async () => {
  const token = second.idToken
  await request(port, '/api/profile', { topicIds: ['youth'], ageGroup: 'early20s', occupation: 'university', privacyConsent: true }, token, 'PUT')
  const feed = (await request(port, '/api/feed', undefined, token)).data
  assert.deepEqual([feed.total, feed.matched, feed.hasInterests, feed.profileComplete], [1, 1, true, true])
  assert.equal(feed.items[0].id, newsItem.newsKey)
  assert.equal(feed.items[0].match.score, 73)
  const detail = (await request(port, `/api/feed/${newsItem.newsKey}`, undefined, token)).data
  assert.deepEqual([detail.reason, detail.feedback, detail.bookmarked, detail.converted], [null, null, false, null])
  assert.equal((await request(port, `/api/feed/${newsItem.newsKey}/reason`, {}, token)).data.reason, '취업 준비에 도움이 돼요.')
  assert.equal((await request(port, `/api/feed/${newsItem.newsKey}/feedback`, { value: 'bad' }, token, 'PUT')).status, 200)
  assert.equal((await request(port, `/api/feed/${newsItem.newsKey}/bookmark`, { saved: true }, token, 'PUT')).status, 200)
  const after = (await request(port, `/api/feed/${newsItem.newsKey}`, undefined, token)).data
  assert.deepEqual([after.reason, after.feedback, after.bookmarked], ['취업 준비에 도움이 돼요.', 'bad', true])
  assert.equal((await request(port, '/api/feed', undefined, token)).data.items.length, 0)
  const own = (await request(port, `/api/feed/${newsItem.newsKey}`, undefined, account.idToken)).data
  assert.deepEqual([own.feedback, own.bookmarked], [null, false])
  assert.equal((await request(port, `/api/feed/${'d'.repeat(32)}`, undefined, token)).status, 404)
  // 사는 지역: validated against the 시·군·구 list and shown back on the feed.
  assert.equal((await request(port, '/api/profile', { region: { sido: '경상북도', sigungu: '해운대구' } }, token, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { region: { sido: '경상북도', sigungu: '경산시' } }, token, 'PUT')).status, 200)
  const local = (await request(port, '/api/feed', undefined, token)).data
  assert.deepEqual(local.region, { sido: '경상북도', sigungu: '경산시' })
  assert.equal(local.summary[0], '경산시')
  const places = await adminServices().db.collection('regionsInUse').doc('경상북도_경산시').get()
  assert.equal(places.data().query, '경산시')
  assert.ok(Array.isArray((await request(port, `/api/feed/${newsItem.newsKey}/similar`, undefined, token)).data))
  assert.equal((await request(port, `/api/feed/${newsItem.newsKey}/image`, undefined, token)).data.imageUrl, 'https://cdn.example/test.jpg')
  assert.equal((await adminServices().db.collection('newsArticles').doc(newsItem.newsKey).get()).data().imageUrl, 'https://cdn.example/test.jpg')
  assert.equal((await request(port, `/api/feed/${newsItem.newsKey}/feedback`, { value: 'meh' }, token, 'PUT')).status, 400)
})

test('typed keywords are expanded once when saved and then match stories by meaning', async () => {
  const token = account.idToken
  const stamp = String(Date.now()).slice(-6)
  const [backend, nonsense] = ['백엔드' + stamp, '흠흠냐' + stamp]
  await request(port, '/api/profile', { topicIds: [], customKeywords: [backend, nonsense], ageGroup: 'early20s', occupation: 'university', privacyConsent: true }, token, 'PUT')
  assert.deepEqual(expandCalls.sort(), [backend, nonsense])
  const feed = (await request(port, '/api/feed', undefined, token)).data
  assert.equal(feed.items[0]?.id, newsItem.newsKey)
  assert.equal(feed.items[0].match.interest, 38)
  assert.ok(feed.items[0].match.matchedTags.includes('#' + backend))
  await request(port, '/api/profile', { customKeywords: [backend] }, token, 'PUT')
  assert.equal(expandCalls.length, 2)
  await request(port, '/api/profile', { topicIds: ['economy'], customKeywords: [] }, token, 'PUT')
})

test('chat rooms are created by the first message, continue with history, and can be deleted', async () => {
  const token = account.idToken
  const path = `/api/chats/${newsItem.newsKey}`
  const empty = (await request(port, path, undefined, token)).data
  assert.equal(empty.room, null)
  assert.equal(empty.article.title, newsItem.title)
  const first = (await request(port, path + '/messages', { text: '', quote: '오프라인 통합 테스트' }, token)).data
  assert.equal(first.created, true)
  assert.deepEqual(first.messages.map(message => [message.role, message.text]), [['user', ''], ['assistant', '답변 0: 오프라인 통합 테스트']])
  const next = (await request(port, path + '/messages', { text: '나한테 어떤 영향이 있어?' }, token)).data
  assert.equal(next.created, false)
  assert.equal(next.messages[1].text, '답변 2: 나한테 어떤 영향이 있어?')
  const offTopic = (await request(port, path + '/messages', { text: '오늘 점심 메뉴 추천해 줘' }, token)).data
  assert.equal(offTopic.messages[1].offTopic, true)
  assert.equal((await request(port, path + '/messages', { text: '' }, token)).status, 400)
  const room = (await request(port, path, undefined, token)).data
  assert.equal(room.messages.length, 6)
  assert.equal(room.messages[0].quote, '오프라인 통합 테스트')
  assert.equal(room.room.context, undefined)
  const list = (await request(port, '/api/chats', undefined, token)).data
  assert.equal(list.length, 1)
  assert.equal(list[0].lastMessage.text, '뉴스·기사 관련 질문을 도와드려요.')
  assert.deepEqual((await request(port, '/api/chats', undefined, second.idToken)).data, [])
  assert.equal((await request(port, path, undefined, token, 'DELETE')).data.deleted, true)
  assert.deepEqual((await request(port, '/api/chats', undefined, token)).data, [])
})

test('unlimited conversions accept parallel requests and rollback cancellation', async () => {
  const uid = account.localId
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => reserveConversion(uid)))
  const leases = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  assert.equal(leases.length, 6)
  assert.equal((await getQuota(uid)).unlimited, true)
  await leases[0]()
  assert.equal((await getQuota(uid)).remaining, null)
  const replacement = await reserveConversion(uid)
  await replacement({ id: 'a'.repeat(32), title: '저장된 기사', originalParagraphs: ['원문'], easyParagraphs: ['쉬운말'], sourceUrl: 'https://example.com' })
  await replacement() // Repeated completion must not double charge.
  await Promise.all(leases.slice(1).map(settle => settle()))
  assert.equal((await getQuota(uid)).remaining, null)
  const usage = (await adminServices().db.collection('users').doc(uid).collection('usage').doc(usageDay()).get()).data()
  assert.equal(usage.count, 1)
  assert.deepEqual(usage.pending, {})
  assert.equal((await request(port, `/api/articles/${'a'.repeat(32)}`, undefined, account.idToken)).status, 200)
  assert.equal((await request(port, `/api/articles/${'a'.repeat(32)}`, undefined, second.idToken)).status, 404)
})

test('unsupported URL schemes are rejected before network access', async () => {
  const result = await request(port, '/api/articles/preview', { sourceUrl: 'ftp://example.com/news' })
  assert.equal(result.status, 400)
  assert.equal(result.data.code, 'INVALID_URL')
})

test('guests and members can manage their interest topic notification settings', async () => {
  const name = 'news_' + Date.now().toString(36)
  const member = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    email: name + '@id.easynews.invalid', password: 'reader1234', returnSecureToken: true,
  })).data
  const token = member.idToken
  assert.ok(token)
  assert.equal((await request(port, '/api/auth/username?id=' + name)).data.available, false)
  assert.equal((await request(port, '/api/notification-settings', { enabled: true }, account.idToken, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/profile', { topicIds: ['health'], completed: true }, token, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/notification-settings', { enabled: false }, token, 'PUT')).status, 200)
  assert.deepEqual((await request(port, '/api/notification-settings', undefined, token)).data, { enabled: false, topicIds: ['health'] })
  assert.deepEqual((await request(port, '/api/notifications', undefined, token)).data, [])
  assert.equal((await request(port, '/api/subscription', undefined, token)).data.active, false)
  const quota = (await request(port, '/api/quota', undefined, token)).data
  assert.equal(quota.unlimited, true)
  assert.equal(quota.subscriber, false)
  assert.equal((await request(port, '/api/notification-settings', { enabled: true, role: 'subscriber' }, token, 'PUT')).status, 400)
})

test('conversion streams actual stages, saves the result and refunds provider failure', async () => {
  const token = second.idToken
  rewriteShouldFail = true
  const failed = await request(port, '/api/convert', { sourceUrl: fixtureArticle.sourceUrl }, token)
  assert.match(failed.data, /event: error/)
  assert.equal((await getQuota(second.localId)).remaining, null)
  rewriteShouldFail = false
  const result = await request(port, '/api/convert', { sourceUrl: fixtureArticle.sourceUrl }, token)
  assert.match(result.data, /"step":1/)
  assert.match(result.data, /"step":2/)
  assert.match(result.data, /"step":3/)
  assert.match(result.data, /event: result/)
  assert.match(result.data, /"background":"배경"/)
  assert.equal((await getQuota(second.localId)).remaining, null)
  assert.equal((await request(port, `/api/articles/${fixtureArticle.id}`, undefined, token)).data.easyTitle, '쉬운 제목')
})
