import { randomInt } from 'node:crypto'
import express from 'express'
import { z } from 'zod'
import { AppError, publicError } from './errors.js'
import { getConfig, TOPIC_IDS } from './config.js'
import { adminServices, requireUser } from './firebase.js'
import { getSubscription } from './subscription.js'
import { registerDevice } from './push.js'
import { readArticle } from './articles.js'
import { getNaverHubNews, getNews, relatedCandidates } from './news.js'
import { buildComparison } from './comparison.js'
import { assertAiConfigured, rewriteArticle, compareArticles, answerQuestion } from './ai.js'
import { getProfile, saveProfile, getQuota, reserveConversion, getArticle, getHistory, reserveQuestion, notificationReads, markNotificationRead } from './store.js'

const urlSchema = z.object({ sourceUrl: z.string().url().max(2048) }).strict()
const profileSchema = z.object({ topicIds: z.array(z.enum(TOPIC_IDS)).max(7).refine(ids => new Set(ids).size === ids.length), completed: z.boolean() }).strict()
const questionSchema = z.object({ articleId: z.string().regex(/^[a-f0-9]{32}$/), sourceUrl: z.string().url().max(2048), sentence: z.string().trim().min(1).max(5000), question: z.string().trim().min(1).max(1000) }).strict()
const rate = new Map()
const homeNewsLimit = 10

export function createApp({ articleReader = readArticle, rewrite = rewriteArticle, findRelated = relatedCandidates, compare = compareArticles } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use((request, response, next) => {
    const origin = request.headers.origin
    if (origin && !getConfig().allowedOrigins.includes(origin)) return next(new AppError('ORIGIN_REJECTED', '이 주소에서는 요청할 수 없어요.', 403))
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin') }
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (request.method === 'OPTIONS') return response.sendStatus(204)
    next()
  })
  app.use(express.json({ limit: '20kb' }))
  // Public fetch routes are bounded too. Production should additionally use App Check / edge rate limits.
  app.use((request, _response, next) => {
    const key = request.ip
    const now = Date.now()
    const current = rate.get(key)
    const bucket = current && current.until > now ? current : { count: 0, until: now + 60_000 }
    bucket.count += 1
    rate.set(key, bucket)
    if (rate.size > 5000) for (const [ip, value] of rate) if (value.until <= now) rate.delete(ip)
    if (bucket.count > 90) return next(new AppError('TOO_MANY_REQUESTS', '요청이 많아요. 잠시 후 다시 시도해 주세요.', 429))
    next()
  })
  const router = express.Router()
  router.get('/health', (_request, response) => response.json({ ok: true, aiConfigured: Boolean(getConfig().aiKey && getConfig().aiModel), firebaseProject: getConfig().projectId }))
  router.get('/news', async (request, response) => {
    const query = z.object({ query: z.string().max(100).default(''), topic: z.enum(['', ...TOPIC_IDS]).default(''), sort: z.enum(['latest', 'oldest']).default('latest'), page: z.coerce.number().int().min(1).max(20).default(1) }).parse(request.query)
    response.json(await getNews(query))
  })
  router.post('/articles/preview', async (request, response) => response.json(await readArticle(urlSchema.parse(request.body).sourceUrl)))
  router.get('/auth/username', async (request, response) => {
    const id = z.string().regex(/^[a-z0-9_]{4,24}$/).parse(request.query.id)
    try {
      await adminServices().auth.getUserByEmail(`${id}@id.easynews.invalid`)
      response.json({ available: false })
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
      response.json({ available: true })
    }
  })
  router.use(async (request, _response, next) => { request.user = await requireUser(request); next() })
  const memberOnly = (request, _response, next) => next(request.user.anonymous
    ? new AppError('MEMBER_REQUIRED', '로그인 후 이용해 주세요.', 403) : undefined)
  router.get('/subscription', memberOnly, async (request, response) => response.json(await getSubscription(request.user)))
  router.put('/notification-device', memberOnly, async (request, response) => {
    const { token, remove } = z.object({ token: z.string().min(16).max(4096), remove: z.boolean() }).strict().parse(request.body)
    response.json(await registerDevice(request.user.uid, token, remove))
  })
  router.get('/notification-settings', memberOnly, async (request, response) => {
    const profile = await getProfile(request.user.uid)
    response.json({ enabled: profile.notificationsEnabled !== false, topicIds: profile.topicIds })
  })
  router.put('/notification-settings', memberOnly, async (request, response) => {
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(request.body)
    await saveProfile(request.user.uid, { notificationsEnabled: enabled, notificationsChangedAt: Date.now() })
    response.json({ enabled })
  })
  router.get('/profile', async (request, response) => response.json(await getProfile(request.user.uid)))
  router.put('/profile', async (request, response) => response.json(await saveProfile(request.user.uid, profileSchema.parse(request.body))))
  router.get('/quota', async (request, response) => {
    const plan = await getSubscription(request.user)
    response.json(plan.active ? { remaining: null, limit: null, unlimited: true } : await getQuota(request.user.uid))
  })
  router.get('/history', async (request, response) => response.json(await getHistory(request.user.uid)))
  router.get('/recommendations', memberOnly, async (request, response) => {
    const profile = await getProfile(request.user.uid)
    const topics = (profile.topicIds ?? []).filter(topic => TOPIC_IDS.includes(topic))
    const { naverHub } = getConfig()
    if (naverHub) {
      const searchTopics = topics.length ? topics : [TOPIC_IDS[randomInt(TOPIC_IDS.length)]]
      const share = Math.floor(homeNewsLimit / searchTopics.length)
      const remainder = homeNewsLimit % searchTopics.length
      const results = await Promise.all(searchTopics.map((topic, index) => getNaverHubNews(topic, naverHub, share + Number(index < remainder))))
      const items = results.flatMap(result => result.items)
      return response.json({ items, total: items.length, hasMore: false, source: 'naver-hub' })
    }
    const news = await getNews({ topics, limit: topics.length ? homeNewsLimit : 30 })
    if (topics.length) return response.json({ ...news, hasMore: false })
    const remaining = news.items.map((_, index) => index)
    const selected = new Set()
    while (remaining.length && selected.size < homeNewsLimit) selected.add(remaining.splice(randomInt(remaining.length), 1)[0])
    response.json({ ...news, items: news.items.filter((_, index) => selected.has(index)), hasMore: false })
  })
  router.get('/notifications', memberOnly, async (request, response) => {
    const profile = await getProfile(request.user.uid)
    if (profile.notificationsEnabled === false || !profile.topicIds?.length) return response.json([])
    const [news, reads] = await Promise.all([getNews({ topics: profile.topicIds, limit: 20 }), notificationReads(request.user.uid)])
    response.json(news.items.map(item => ({ ...item, read: reads.has(item.id) })))
  })
  router.post('/notifications/:id/read', memberOnly, async (request, response) => {
    const id = z.string().regex(/^[a-f0-9]{32}$/).parse(request.params.id)
    response.json(await markNotificationRead(request.user.uid, id))
  })
  router.get('/articles/:id', async (request, response) => {
    if (!/^[a-f0-9]{32}$/.test(request.params.id)) throw new AppError('INVALID_ID', '기사 주소를 확인해 주세요.')
    response.json(await getArticle(request.user.uid, request.params.id))
  })
  router.post('/questions', async (request, response) => {
    assertAiConfigured()
    const { articleId, sourceUrl, sentence, question } = questionSchema.parse(request.body)
    const article = await getArticle(request.user.uid, articleId).catch(async error => {
      if (error.code !== 'ARTICLE_NOT_FOUND') throw error
      const original = await articleReader(sourceUrl)
      if (original.id !== articleId) throw new AppError('ARTICLE_NOT_FOUND', '선택한 문장이 있는 기사를 찾지 못했어요.', 404)
      return original
    })
    await reserveQuestion(request.user.uid)
    response.json({ answer: await answerQuestion(article, sentence, question) })
  })
  router.post('/convert', async (request, response) => {
    assertAiConfigured()
    const { sourceUrl } = urlSchema.parse(request.body)
    const plan = await getSubscription(request.user)
    const settle = await reserveConversion(request.user.uid, plan.active)
    const controller = new AbortController()
    const disconnect = () => { if (!response.writableEnded) controller.abort() }
    response.on('close', disconnect)
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()
    const send = (type, data) => { if (!response.destroyed) response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`) }
    const heartbeat = setInterval(() => { if (!response.destroyed) response.write(': heartbeat\n\n') }, 15_000)
    try {
      send('progress', { step: 1 })
      const article = await articleReader(sourceUrl, controller.signal)
      send('progress', { step: 2 })
      const { keywords, comparisonQueries = [], ...rewritten } = await rewrite(article, controller.signal)
      Object.assign(article, rewritten)
      send('progress', { step: 3 })
      Object.assign(article, await buildComparison(article, keywords, {
        queries: comparisonQueries, signal: controller.signal, findRelated, articleReader, compare,
      }))
      controller.signal.throwIfAborted()
      await settle(article)
      send('result', article)
    } catch (error) {
      await settle().catch(() => {})
      if (!controller.signal.aborted) send('error', publicError(error))
    } finally {
      clearInterval(heartbeat)
      response.off('close', disconnect)
      response.end()
    }
  })
  app.use('/api', router)
  app.use((error, _request, response, _next) => {
    const mapped = error instanceof z.ZodError || error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large'
      ? publicError(new AppError('INVALID_REQUEST', '입력한 내용을 확인해 주세요.')) : publicError(error)
    response.status(mapped.status).json(mapped)
  })
  return app
}
