import { JSDOM } from 'jsdom'
import { XMLParser } from 'fast-xml-parser'
import { articleId, inferTopic, cleanText } from './articles.js'
import { safeFetchText, parsePublicUrl } from './safeFetch.js'
import { getConfig } from './config.js'
import { AppError } from './errors.js'

const cache = new Map()
const topicQueries = {
  economy: '(economy OR finance OR stock OR inflation)', politics: '(president OR election OR parliament)',
  society: '(society OR police OR education)', technology: '(technology OR science OR semiconductor)',
  health: '(health OR hospital OR medicine)', culture: '(culture OR film OR music)', lifestyle: '(weather OR travel OR food)',
}
const topicLabels = { economy: '경제', politics: '정치', society: '사회', technology: '과학 기술', health: '건강 의료', culture: '문화', lifestyle: '생활' }
const publisherNames = { 'yna.co.kr': '연합뉴스', 'news.sbs.co.kr': 'SBS 뉴스', 'imnews.imbc.com': 'MBC 뉴스', 'news.kbs.co.kr': 'KBS 뉴스', 'hani.co.kr': '한겨레', 'chosun.com': '조선일보', 'donga.com': '동아일보', 'hankyung.com': '한국경제', 'mk.co.kr': '매일경제', 'khan.co.kr': '경향신문' }

function plainText(value) { return cleanText(JSDOM.fragment(String(value || '')).textContent) }
function publisher(url) {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return Object.entries(publisherNames).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || host
}
function isoDate(value) {
  const normalized = /^\d{8}T\d{6}Z$/.test(value || '') ? value.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z') : value
  return normalized && !Number.isNaN(Date.parse(normalized)) ? new Date(normalized).toISOString() : ''
}
function itemFrom({ title, url, date, image, description, category }) {
  try {
    const sourceUrl = parsePublicUrl(url).href
    const cleanTitle = plainText(title)
    if (!cleanTitle) return null
    let imageUrl
    try { if (image && new URL(image).protocol === 'https:') imageUrl = parsePublicUrl(image).href } catch { /* 이미지는 선택 항목이다. */ }
    return { id: articleId(sourceUrl), title: cleanTitle, sourceUrl, publisher: publisher(sourceUrl), publishedAt: isoDate(date), topicId: category || inferTopic(cleanTitle), excerpt: plainText(description).slice(0, 500), ...(imageUrl ? { imageUrl } : {}) }
  } catch { return null }
}

async function cached(key, loader) {
  const current = cache.get(key)
  if (current && current.expires > Date.now()) return current.value
  const promise = loader().catch(error => { const entry = cache.get(key); if (entry) entry.expires = Date.now() + 30_000; throw error })
  cache.set(key, { value: promise, expires: Date.now() + 5 * 60_000 })
  if (cache.size > 100) cache.delete(cache.keys().next().value)
  return promise
}

async function fromNaver(query, topic, { signal, sort = 'date' } = {}) {
  const url = new URL('https://openapi.naver.com/v1/search/news.json')
  url.search = new URLSearchParams({ query: query || topicLabels[topic] || '뉴스', display: '100', sort }).toString()
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000), headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET } })
  if (!response.ok) throw new AppError('NEWS_UNAVAILABLE', '뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
  const data = await response.json()
  return (data.items || []).map(item => itemFrom({ title: item.title, url: item.originallink || item.link, date: item.pubDate, description: item.description, category: topic })).filter(Boolean)
}

async function fromGdelt(topic, { query = '', publishedAt, signal } = {}) {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  const params = new URLSearchParams({ query: `${query || topicQueries[topic] || ''} sourcelang:korean`.trim(), mode: 'artlist', format: 'json', maxrecords: '250', sort: query ? 'hybridrel' : 'datedesc' })
  const reference = Date.parse(publishedAt)
  if (query && Number.isFinite(reference)) {
    const format = time => new Date(time).toISOString().replace(/\D/g, '').slice(0, 14)
    params.set('startdatetime', format(reference - 14 * 86400_000))
    params.set('enddatetime', format(Math.min(Date.now(), reference + 14 * 86400_000)))
  } else params.set('timespan', query ? '30d' : '72h')
  url.search = params.toString()
  // Fixed provider URL; article bodies still use the DNS-pinned reader.
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) })
  if (!response.ok) throw new AppError('NEWS_UNAVAILABLE', '뉴스 제공 서비스가 혼잡해요. 잠시 후 다시 시도해 주세요.', 503)
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { throw new AppError('NEWS_UNAVAILABLE', '뉴스 제공 서비스의 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.', 503) }
  return (data.articles || []).map(item => itemFrom({ title: item.title, url: item.url, date: item.seendate, image: item.socialimage, category: topic })).filter(Boolean)
}

function rssFeedTopic(feedUrl) {
  const path = new URL(feedUrl).pathname
  return Object.keys(topicLabels).find(topic => new RegExp(`/(?:${topic === 'technology' ? 'science|technology' : topic})(?:/|\\.xml|$)`).test(path))
}

export function parseRssFeed(text, feedUrl) {
  const parser = new XMLParser({ ignoreAttributes: false, processEntities: false })
  const data = parser.parse(text)
  const rawItems = data.rss?.channel?.item || []
  const feedTopic = rssFeedTopic(feedUrl)
  return (Array.isArray(rawItems) ? rawItems : [rawItems]).map(item => itemFrom({
    title: item.title, url: item.link, date: item.pubDate || item['dc:date'],
    description: item.description,
    image: item.enclosure?.['@_url'] || item['media:content']?.['@_url'],
    category: feedTopic,
  })).filter(Boolean)
}

async function fromConfiguredRss({ signal } = {}) {
  const responses = await Promise.allSettled(getConfig().rssFeeds.map(async url => {
    const { text } = await safeFetchText(url, { signal, accept: 'application/rss+xml,application/xml,text/xml' })
    return { items: parseRssFeed(text, url), section: Boolean(rssFeedTopic(url)) }
  }))
  // Section feeds carry a more reliable topic than keyword inference in the
  // general feed. Keep those entries first when duplicate URLs are removed.
  const items = responses.filter(result => result.status === 'fulfilled')
    .sort((a, b) => Number(b.value.section) - Number(a.value.section))
    .flatMap(result => result.value.items)
  if (!items.length) throw new AppError('NEWS_UNAVAILABLE', '뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
  return items
}

/** RSS는 이용 권한을 확인한 주소를 NEWS_RSS_FEEDS에 명시했을 때만 사용한다. */
export async function getNews({ query = '', topic = '', topics = [], sort = 'latest', page = 1, limit = 24 } = {}) {
  const naver = Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)
  const rss = getConfig().rssFeeds.length > 0
  const key = naver ? `naver:${topic}:${query}` : rss ? 'rss' : `gdelt:${topic}`
  let items
  try { items = await cached(key, () => naver ? fromNaver(query, topic) : rss ? fromConfiguredRss() : fromGdelt(topic)) }
  catch (error) { if (error instanceof AppError) throw error; throw new AppError('NEWS_UNAVAILABLE', '뉴스 제공 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 503) }
  const uniqueItems = new Map()
  for (const item of items) if (!uniqueItems.has(item.id)) uniqueItems.set(item.id, item)
  items = [...uniqueItems.values()]
  if (!naver && query.trim()) {
    const terms = query.toLocaleLowerCase('ko').split(/\s+/).filter(Boolean)
    items = items.filter(item => terms.every(term => `${item.title} ${item.publisher} ${item.excerpt}`.toLocaleLowerCase('ko').includes(term)))
  }
  if (topic && rss) items = items.filter(item => item.topicId === topic)
  if (topics.length) items = items.filter(item => topics.includes(item.topicId))
  items.sort((a, b) => ((Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)) * (sort === 'oldest' ? -1 : 1))
  const pageSize = Math.min(250, Math.max(1, limit))
  const offset = (Math.max(1, Number(page) || 1) - 1) * pageSize
  return { items: items.slice(offset, offset + pageSize), total: items.length, hasMore: offset + pageSize < items.length, source: naver ? 'naver' : rss ? 'rss' : 'gdelt' }
}

/** Normalize known publisher subdomains without confusing unrelated .co.kr domains. */
export function publisherKey(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return Object.keys(publisherNames).find(domain => host === domain || host.endsWith(`.${domain}`)) || host.replace(/^(?:m|news)\./, '')
  } catch { return '' }
}

function queryText(value, max = 100) {
  return cleanText(String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}\s-]/gu, ' ')).slice(0, max)
}

export function comparisonSearchQueries(keywords = [], queries = []) {
  const fallback = keywords.map(word => queryText(word)).filter(word => word.length >= 2).slice(0, 3).join(' ')
  const seen = new Set()
  const result = queries.slice(0, 3).map(query => ({ ko: queryText(query.ko), en: queryText(query.en, 180) }))
    .filter(query => {
      if (query.ko.length < 2 || seen.has(query.ko)) return false
      seen.add(query.ko)
      return true
    })
  return result.length ? result : fallback ? [{ ko: fallback, en: '' }] : []
}

function gdeltSearchQuery(queries) {
  // DOC searches English machine translations. Quote literal terms so AI text cannot inject operators.
  const stop = new Set(['a', 'an', 'the', 'of', 'for', 'in', 'on', 'and', 'or', 'to', 'with', 'by'])
  const groups = queries.map(query => [...new Set(query.en.toLowerCase().split(/\s+/)
    .filter(word => /^[a-z0-9-]{2,}$/.test(word) && !stop.has(word)))].slice(0, 6)
    .map(word => '"' + word + '"').join(' ')).filter(Boolean)
  return groups.length > 1 ? '(' + groups.join(' OR ') + ')' : groups[0] || ''
}

export async function relatedCandidates(article, keywords = [], { queries = [], signal } = {}) {
  const searchQueries = comparisonSearchQueries(keywords, queries)
  if (!searchQueries.length) return { items: [], partial: false }
  const naver = Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)
  const englishQuery = gdeltSearchQuery(searchQueries)
  const searchGdelt = () => englishQuery
    ? fromGdelt('', { query: englishQuery, publishedAt: article.publishedAt, signal })
    : Promise.reject(new AppError('COMPARISON_SEARCH_UNAVAILABLE', '비교 기사 검색어를 준비하지 못했어요.', 503))
  let responses = await Promise.allSettled(naver
    ? searchQueries.map(query => fromNaver(query.ko, '', { signal, sort: 'sim' }))
    : [searchGdelt()])
  signal?.throwIfAborted()
  // A failed primary search can use the other provider; RSS is supplementary, never a substitute for topic search.
  if (naver && (!responses.some(result => result.status === 'fulfilled' && result.value.length))) {
    responses.push(...await Promise.allSettled([searchGdelt()]))
  }
  if (getConfig().rssFeeds.length) {
    responses.push(...await Promise.allSettled([fromConfiguredRss({ signal })]))
  }
  signal?.throwIfAborted()
  if (!responses.some(result => result.status === 'fulfilled')) {
    throw new AppError('COMPARISON_SEARCH_UNAVAILABLE', '다른 관점의 기사를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
  }
  const source = publisherKey(article.sourceUrl)
  const reference = Date.parse(article.publishedAt)
  const terms = [...new Set([...keywords, ...searchQueries.flatMap(query => query.ko.split(/\s+/))]
    .map(word => queryText(word).toLocaleLowerCase('ko')).filter(word => word.length >= 2))]
  const unique = new Map()
  for (const result of responses) {
    if (result.status !== 'fulfilled') continue
    for (const item of result.value) {
      const host = publisherKey(item.sourceUrl)
      if (!host || host === source || /(?:^|\.)naver\.com$/.test(host) || unique.has(item.id)) continue
      const date = Date.parse(item.publishedAt)
      if (Number.isFinite(reference) && Number.isFinite(date) && Math.abs(reference - date) > 14 * 86400_000) continue
      const text = (item.title + ' ' + item.excerpt).toLocaleLowerCase('ko')
      const score = terms.filter(term => text.includes(term)).length
      if (score) unique.set(item.id, { item, score, host })
    }
  }
  const sorted = [...unique.values()].sort((a, b) => b.score - a.score)
  const counts = new Map()
  const diverse = []
  // Round-robin publishers before taking a second candidate from any one outlet.
  for (let round = 0; round < 2; round++) {
    for (const entry of sorted) {
      const count = counts.get(entry.host) || 0
      if (count !== round || diverse.some(item => item.id === entry.item.id)) continue
      counts.set(entry.host, count + 1)
      diverse.push(entry.item)
    }
  }
  return { items: diverse.slice(0, 16), partial: responses.some(result => result.status === 'rejected') }
}
