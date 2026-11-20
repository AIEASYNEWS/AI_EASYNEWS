import { createHash, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { z } from 'zod'
import { AppError, publicError } from './errors.js'
import { getConfig, TOPIC_IDS } from './config.js'
import { adminServices, requireUser } from './firebase.js'
import { activateDemoSubscription, getSubscription } from './subscription.js'
import { registerDevice } from './push.js'
import { readArticle, articleId } from './articles.js'
import { parsePublicUrl } from './safeFetch.js'
import { isRegion } from './regions.js'
import { findSimilar } from './similar.js'
import { enrichImages } from './images.js'
import { collectNews, getExploreNews } from './news.js'
import { aiConfigured, assertAiConfigured, rewriteArticle, chatAnswer } from './ai.js'
import { getNewsItem, readStoredNews, topicNews, topicNotifications } from './newsCatalog.js'
import { AGE_GROUPS, GENDERS, OCCUPATIONS, expandKeyword, keywordKey, buildFeed, feedItem, personalReason, profileSummary, scoreMatch, tagStoredNews, weightKeys } from './matching.js'
import {
  getProfile, saveProfile, nicknameAvailable, getQuota, reserveConversion, getArticle, getHistory, reserveQuestion, notificationReads, markNotificationRead,
  getFeedbackMap, saveFeedback, getKeywordExpansions, saveKeywordExpansion, getArticleState, setBookmark, getCachedReason, saveReason, findConvertedArticle,
  listChatRooms, getChatRoom, appendChatExchange, deleteChatRoom,
} from './store.js'

const urlSchema = z.object({ sourceUrl: z.string().url().max(2048) }).strict()
const keywordSchema = z.string().trim().min(1).max(20).regex(/^[\p{L}\p{N}][\p{L}\p{N} ·.-]*$/u)
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,10}$/
const profileSchema = z.object({
  topicIds: z.array(z.enum(TOPIC_IDS)).max(TOPIC_IDS.length).refine(ids => new Set(ids).size === ids.length),
  customKeywords: z.array(keywordSchema).max(10).refine(words => new Set(words).size === words.length),
  ageGroup: z.enum(Object.keys(AGE_GROUPS)),
  gender: z.enum(Object.keys(GENDERS)),
  occupation: z.enum(Object.keys(OCCUPATIONS)),
  occupationOther: z.string().trim().max(30),
  region: z.object({ sido: z.string().max(20), sigungu: z.string().max(20) }).strict().refine(isRegion),
  nickname: z.string().trim().regex(NICKNAME_PATTERN),
  privacyConsent: z.literal(true),
  completed: z.boolean(),
}).partial().strict()
const newsIdSchema = z.string().regex(/^[a-f0-9]{32}$/)
const chatSchema = z.object({ text: z.string().trim().max(1000).default(''), quote: z.string().trim().max(2000).optional() }).strict()
  .refine(value => value.text || value.quote)
const rate = new Map()

const roomArticle = item => ({ id: item.newsKey, title: item.title, publisher: item.publisher, publishedAt: item.publishedAt || '', topicId: item.tags?.topics?.[0] || item.topicId, sourceUrl: item.sourceUrl })

export function createApp({ articleReader = readArticle, rewrite = rewriteArticle, answer = chatAnswer, reason = personalReason, catalog = readStoredNews, collect = collectNews, expand = expandKeyword, similar = findSimilar, demoSubscriptions = process.env.ENABLE_DEMO_SUBSCRIPTIONS === 'true' } = {}) {
  const app = express()
  const expanding = new Map()
  /** Creates missing keyword meaning expansions once per keyword; failures leave plain text matching. */
  function ensureExpansions(words, known = {}) {
    const pending = words.filter(word => !known[keywordKey(word)]).map(word => {
      const key = keywordKey(word)
      if (!expanding.has(key)) {
        expanding.set(key, Promise.resolve().then(() => expand(word, AbortSignal.timeout(20_000)))
          .then(value => saveKeywordExpansion(key, word, value)).catch(() => {}).finally(() => expanding.delete(key)))
      }
      return expanding.get(key)
    })
    return Promise.all(pending)
  }
  /** Attaches keyword expansions; missing ones are generated in the background for the next visit. */
  async function readerProfile(uid) {
    const profile = await getProfile(uid)
    const words = profile.customKeywords || []
    if (!words.length) return profile
    const keywordExpansions = await getKeywordExpansions(words.map(keywordKey)).catch(() => ({}))
    if (aiConfigured()) void ensureExpansions(words, keywordExpansions)
    return { ...profile, keywordExpansions }
  }
  const subscriptionFor = user => getSubscription(user, demoSubscriptions)
  app.disable('x-powered-by')
  app.use((request, response, next) => {
    const origin = request.headers.origin
    if (origin && !getConfig().allowedOrigins.includes(origin)) return next(new AppError('ORIGIN_REJECTED', '이 주소에서는 요청할 수 없어요.', 403))
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin') }
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
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
    response.json(await getExploreNews(query))
  })
  router.post('/articles/preview', async (request, response) => response.json(await articleReader(parsePublicUrl(urlSchema.parse(request.body).sourceUrl).href)))
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
  // Called every 30 minutes by the GitHub Actions schedule (.github/workflows/collect-news.yml).
  router.post('/cron/collect', async (request, response) => {
    const secret = getConfig().cronSecret
    if (!secret) throw new AppError('CRON_NOT_CONFIGURED', '수집 작업 설정을 확인해 주세요.', 503)
    const digest = value => createHash('sha256').update(value).digest()
    const given = /^Bearer (.+)$/.exec(request.headers.authorization || '')?.[1] || ''
    if (!timingSafeEqual(digest(given), digest(secret))) throw new AppError('CRON_UNAUTHORIZED', '수집 작업 권한을 확인하지 못했어요.', 401)
    // Leave headroom under the 300-second function limit for the response.
    response.json(await collect(undefined, { tagLimit: 90, deadline: Date.now() + 200_000 }))
  })
  router.get('/auth/nickname', async (request, response) => {
    const nickname = z.string().trim().regex(NICKNAME_PATTERN).parse(request.query.name)
    const user = request.headers.authorization ? await requireUser(request).catch(() => null) : null
    response.json({ available: await nicknameAvailable(nickname, user?.uid) })
  })
  router.use(async (request, _response, next) => { request.user = await requireUser(request); next() })
  const memberOnly = (request, _response, next) => next(request.user.anonymous
    ? new AppError('MEMBER_REQUIRED', '로그인 후 이용해 주세요.', 403) : undefined)
  router.get('/subscription', memberOnly, async (request, response) => response.json(await subscriptionFor(request.user)))
  if (demoSubscriptions) {
    router.post('/subscription/demo', memberOnly, async (request, response) => {
      await activateDemoSubscription(request.user.uid)
      response.json(await subscriptionFor(request.user))
    })
  }
  router.put('/notification-device', async (request, response) => {
    const { token, remove } = z.object({ token: z.string().min(16).max(4096), remove: z.boolean() }).strict().parse(request.body)
    response.json(await registerDevice(request.user.uid, token, remove))
  })
  router.get('/notification-settings', async (request, response) => {
    const profile = await getProfile(request.user.uid)
    response.json({ enabled: profile.notificationsEnabled !== false, topicIds: profile.topicIds })
  })
  router.put('/notification-settings', async (request, response) => {
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(request.body)
    await saveProfile(request.user.uid, { notificationsEnabled: enabled, notificationsChangedAt: Date.now() })
    response.json({ enabled })
  })
  router.get('/profile', async (request, response) => {
    const { keywordWeights: _weights, notificationsEnabled: _notifications, ...profile } = await getProfile(request.user.uid)
    response.json(profile)
  })
  router.put('/profile', async (request, response) => {
    const update = profileSchema.parse(request.body)
    if (update.nickname !== undefined && request.user.anonymous) throw new AppError('MEMBER_REQUIRED', '로그인 후 닉네임을 정할 수 있어요.', 403)
    if (update.occupation && update.occupation !== 'other') update.occupationOther = ''
    await saveProfile(request.user.uid, update)
    // Understand new typed keywords now so the next home visit already matches by meaning.
    if (update.customKeywords?.length && aiConfigured()) {
      const known = await getKeywordExpansions(update.customKeywords.map(keywordKey)).catch(() => ({}))
      await ensureExpansions(update.customKeywords, known)
    }
    const { keywordWeights: _weights, notificationsEnabled: _notifications, ...profile } = await getProfile(request.user.uid)
    response.json(profile)
  })
  router.get('/quota', async (request, response) => {
    const plan = await subscriptionFor(request.user)
    response.json({ ...(plan.active ? { remaining: null, limit: null, unlimited: true } : await getQuota(request.user.uid)), subscriber: plan.active })
  })
  router.get('/history', async (request, response) => response.json(await getHistory(request.user.uid)))
  router.get('/recommendations', async (request, response) => {
    const profile = await getProfile(request.user.uid)
    response.json(await topicNews(profile.topicIds))
  })
  router.get('/notifications', async (request, response) => {
    const profile = await getProfile(request.user.uid)
    const [items, reads] = await Promise.all([topicNotifications(profile), notificationReads(request.user.uid)])
    response.json(items.map(item => ({ ...item, read: reads.has(item.id) })))
  })
  router.post('/notifications/:id/read', async (request, response) => {
    const id = z.string().regex(/^[a-f0-9]{32}$/).parse(request.params.id)
    response.json(await markNotificationRead(request.user.uid, id))
  })
  router.get('/articles/:id', async (request, response) => {
    if (!/^[a-f0-9]{32}$/.test(request.params.id)) throw new AppError('INVALID_ID', '기사 주소를 확인해 주세요.')
    response.json(await getArticle(request.user.uid, request.params.id))
  })
  const loadItem = async id => {
    const item = await getNewsItem(newsIdSchema.parse(id))
    if (!item) throw new AppError('NEWS_NOT_FOUND', '기사를 찾지 못했어요. 홈에서 다시 골라 주세요.', 404)
    return item
  }
  router.get('/feed', async (request, response) => {
    const [profile, feedback, { items }] = await Promise.all([readerProfile(request.user.uid), getFeedbackMap(request.user.uid), catalog()])
    const feed = buildFeed(profile, items, { feedback })
    // Articles collected before tagging existed are tagged lazily; the next visit gets the AI-backed scores.
    void tagStoredNews(adminServices().db, items.filter(item => Date.now() - (Date.parse(item.publishedAt) || item.firstSeenAt || 0) < 86400_000), { limit: 45 }).catch(() => {})
    // The top story's personal reason, when already written for this reader (Figma A2: 이 기사가 추천된 이유).
    const topReason = feed.items[0] ? await getCachedReason(request.user.uid, feed.items[0].id, JSON.stringify(profileSummary(profile))).catch(() => null) : null
    response.json({
      ...feed, nickname: profile.nickname || '', summary: profileSummary(profile), topReason,
      region: profile.region || null, topicIds: profile.topicIds, customKeywords: profile.customKeywords,
      hasInterests: Boolean(profile.topicIds.length || profile.customKeywords.length),
      profileComplete: Boolean(profile.ageGroup && profile.occupation), waitingForCollection: !items.length,
    })
  })
  router.get('/feed/:id', async (request, response) => {
    const item = await loadItem(request.params.id)
    const uid = request.user.uid
    const [profile, state, converted] = await Promise.all([readerProfile(uid), getArticleState(uid, item.newsKey), findConvertedArticle(uid, articleId(item.sourceUrl))])
    // Backfill the representative image so the home cards show it next time.
    if (!item.imageUrl && !item.imageCheckedAt) void enrichImages(adminServices().db, [item], { limit: 1 }).catch(() => {})
    const profileKey = JSON.stringify(profileSummary(profile))
    response.json({
      ...feedItem(item, scoreMatch(profile, item)), nickname: profile.nickname || '',
      reason: await getCachedReason(uid, item.newsKey, profileKey), region: profile.region || null,
      ...state, converted: converted?.easyParagraphs?.length ? converted : null,
    })
  })
  router.get('/feed/:id/similar', async (request, response) => {
    const item = await loadItem(request.params.id)
    const { items } = await catalog()
    response.json(await similar(item, items))
  })
  router.post('/feed/:id/reason', async (request, response) => {
    const item = await loadItem(request.params.id)
    const uid = request.user.uid
    const profile = await getProfile(uid)
    const profileKey = JSON.stringify(profileSummary(profile))
    const cached = await getCachedReason(uid, item.newsKey, profileKey)
    if (cached) return response.json({ reason: cached })
    assertAiConfigured()
    const text = await reason(profile, item, AbortSignal.timeout(45_000))
    await saveReason(uid, item.newsKey, profileKey, text)
    response.json({ reason: text })
  })
  router.put('/feed/:id/feedback', async (request, response) => {
    const { value } = z.object({ value: z.enum(['good', 'bad']) }).strict().parse(request.body)
    const item = await loadItem(request.params.id)
    response.json(await saveFeedback(request.user.uid, item.newsKey, value, weightKeys(item)))
  })
  router.put('/feed/:id/bookmark', async (request, response) => {
    const { saved } = z.object({ saved: z.boolean() }).strict().parse(request.body)
    const item = await loadItem(request.params.id)
    response.json(await setBookmark(request.user.uid, item.newsKey, saved))
  })
  router.get('/chats', async (request, response) => response.json(await listChatRooms(request.user.uid)))
  router.get('/chats/:id', async (request, response) => {
    const item = await loadItem(request.params.id)
    const { room, messages } = await getChatRoom(request.user.uid, item.newsKey)
    response.json({ article: room?.article || roomArticle(item), room, messages })
  })
  router.delete('/chats/:id', async (request, response) => response.json(await deleteChatRoom(request.user.uid, newsIdSchema.parse(request.params.id))))
  router.post('/chats/:id/messages', async (request, response) => {
    assertAiConfigured()
    const { text, quote } = chatSchema.parse(request.body)
    const uid = request.user.uid
    const item = await loadItem(request.params.id)
    const { room, messages } = await getChatRoom(uid, item.newsKey, { withContext: true })
    let context = room?.context
    if (!context) {
      const converted = await findConvertedArticle(uid, articleId(item.sourceUrl))
      const original = converted || await articleReader(item.sourceUrl, AbortSignal.timeout(20_000)).catch(() => null)
      context = original ? [...original.originalParagraphs, ...(original.easyParagraphs || [])].join('\n').slice(0, 20_000) : `${item.title}\n${item.excerpt || ''}`
    }
    await reserveQuestion(uid)
    const question = text || '이 부분을 쉬운 말로 풀어 줘'
    const reply = await answer({ title: item.title, context }, messages, { quote, question }, AbortSignal.timeout(60_000))
    response.json(await appendChatExchange(uid, item.newsKey, { article: roomArticle(item), context }, { text, quote }, reply))
  })
  router.post('/convert', async (request, response) => {
    assertAiConfigured()
    const { sourceUrl } = urlSchema.parse(request.body)
    const settle = await reserveConversion(request.user.uid)
    const controller = new AbortController()
    const disconnect = () => { if (!response.writableEnded) controller.abort() }
    response.on('close', disconnect)
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()
    const send = (type, data) => { if (!response.destroyed) response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`) }
    const heartbeat = setInterval(() => { if (!response.destroyed) response.write(': heartbeat\n\n') }, 15_000)
    try {
      // 1: reading the article, 2: finding background, 3: rewriting in easy words.
      send('progress', { step: 1 })
      const article = await articleReader(sourceUrl, controller.signal)
      send('progress', { step: 2 })
      const rewritten = await rewrite(article, controller.signal, step => send('progress', { step }))
      Object.assign(article, rewritten, { convertedAt: Date.now() })
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
