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
const { getQuota, reserveConversion } = await import('../functions/src/store.js')
const { adminServices } = await import('../functions/src/firebase.js')
let server, port, account, second
let rewriteShouldFail = false
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
    rewrite: async () => {
      if (rewriteShouldFail) throw new AppError('AI_INVALID_RESPONSE', '테스트 실패', 502)
      return { easyTitle: '쉬운 제목', easyParagraphs: ['쉬운 본문'], summary: ['핵심 요약'], keywords: ['테스트'], topicId: 'economy' }
    },
    findRelated: async () => [],
    compare: async () => ({ reports: [], comparison: '' }),
  }).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  port = server.address().port
  account = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { returnSecureToken: true })).data
  second = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { returnSecureToken: true })).data
})
after(async () => { await new Promise(resolve => server.close(resolve)); await adminServices().db.terminate(); net.Socket.prototype.connect = originalConnect })

test('requires real Firebase tokens and rejects untrusted origins', async () => {
  assert.equal((await request(port, '/api/profile')).status, 401)
  assert.equal((await request(port, '/api/profile', undefined, 'invalid-token')).status, 401)
  assert.equal((await request(port, '/api/profile', undefined, account.idToken)).status, 200)
})

test('profile schemas reject role escalation and invalid topics; profiles remain account-scoped', async () => {
  assert.equal((await request(port, '/api/profile', { topicIds: ['economy'], completed: true, role: 'admin' }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { topicIds: ['arbitrary'], completed: true }, account.idToken, 'PUT')).status, 400)
  assert.equal((await request(port, '/api/profile', { topicIds: ['economy'], completed: true }, account.idToken, 'PUT')).status, 200)
  assert.deepEqual((await request(port, '/api/profile', undefined, account.idToken)).data.topicIds, ['economy'])
  assert.deepEqual((await request(port, '/api/profile', undefined, second.idToken)).data.topicIds, [])
})

test('parallel conversion reservations enforce daily limits and rollback cancellation', async () => {
  const uid = account.localId
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => reserveConversion(uid)))
  const leases = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  assert.equal(leases.length, 3)
  assert.equal((await getQuota(uid)).remaining, 0)
  await leases[0]()
  assert.equal((await getQuota(uid)).remaining, 1)
  const replacement = await reserveConversion(uid)
  await replacement({ id: 'a'.repeat(32), title: '저장된 기사', originalParagraphs: ['원문'], easyParagraphs: ['쉬운말'], sourceUrl: 'https://example.com' })
  await replacement() // Repeated completion must not double charge.
  await Promise.all(leases.slice(1).map(settle => settle()))
  assert.equal((await getQuota(uid)).remaining, 2)
  assert.equal((await request(port, `/api/articles/${'a'.repeat(32)}`, undefined, account.idToken)).status, 200)
  assert.equal((await request(port, `/api/articles/${'a'.repeat(32)}`, undefined, second.idToken)).status, 404)
})

test('unsupported URL schemes are rejected before network access', async () => {
  const result = await request(port, '/api/articles/preview', { sourceUrl: 'ftp://example.com/news' })
  assert.equal(result.status, 400)
  assert.equal(result.data.code, 'INVALID_URL')
})

test('members can save notification settings without losing topics; guests cannot alter them', async () => {
  const name = 'news_' + Date.now().toString(36)
  const member = (await request(9099, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    email: name + '@id.easynews.invalid', password: 'reader1234', returnSecureToken: true,
  })).data
  const token = member.idToken
  assert.ok(token)
  assert.equal((await request(port, '/api/auth/username?id=' + name)).data.available, false)
  assert.equal((await request(port, '/api/notification-settings', { enabled: true }, account.idToken, 'PUT')).status, 403)
  assert.equal((await request(port, '/api/profile', { topicIds: ['health'], completed: true }, token, 'PUT')).status, 200)
  assert.equal((await request(port, '/api/notification-settings', { enabled: false }, token, 'PUT')).status, 200)
  assert.deepEqual((await request(port, '/api/notification-settings', undefined, token)).data, { enabled: false, topicIds: ['health'] })
  assert.deepEqual((await request(port, '/api/notifications', undefined, token)).data, [])
  assert.equal((await request(port, '/api/subscription', undefined, token)).data.active, false)
  assert.equal((await request(port, '/api/notification-settings', { enabled: true, role: 'subscriber' }, token, 'PUT')).status, 400)
})

test('conversion streams actual stages, saves the result and refunds provider failure', async () => {
  const token = second.idToken
  rewriteShouldFail = true
  const failed = await request(port, '/api/convert', { sourceUrl: fixtureArticle.sourceUrl }, token)
  assert.match(failed.data, /event: error/)
  assert.equal((await getQuota(second.localId)).remaining, 3)
  rewriteShouldFail = false
  const result = await request(port, '/api/convert', { sourceUrl: fixtureArticle.sourceUrl }, token)
  assert.match(result.data, /"step":1/)
  assert.match(result.data, /"step":2/)
  assert.match(result.data, /"step":3/)
  assert.match(result.data, /event: result/)
  assert.match(result.data, /"comparisonStatus":"no-candidates"/)
  assert.equal((await getQuota(second.localId)).remaining, 2)
  assert.equal((await request(port, `/api/articles/${fixtureArticle.id}`, undefined, token)).data.easyTitle, '쉬운 제목')
})
