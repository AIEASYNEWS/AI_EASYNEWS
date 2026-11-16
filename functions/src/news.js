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

async function fromNaver(query, topic) {
  const url = new URL('https://openapi.naver.com/v1/search/news.json')
  url.search = new URLSearchParams({ query: query || topicLabels[topic] || '뉴스', display: '100', sort: 'date' }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET } })
  if (!response.ok) throw new AppError('NEWS_UNAVAILABLE', '뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
  const data = await response.json()
  return (data.items || []).map(item => itemFrom({ title: item.title, url: item.originallink || item.link, date: item.pubDate, description: item.description, category: topic })).filter(Boolean)
}

async function fromGdelt(topic) {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  url.search = new URLSearchParams({ query: `${topicQueries[topic] || ''} sourcelang:korean`.trim(), mode: 'artlist', format: 'json', maxrecords: '250', sort: 'datedesc', timespan: '72h' }).toString()
  // This is a fixed provider URL, separate from arbitrary article URL fetching.
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
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

async function fromConfiguredRss() {
  const responses = await Promise.allSettled(getConfig().rssFeeds.map(async url => {
    const { text } = await safeFetchText(url, { accept: 'application/rss+xml,application/xml,text/xml' })
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

export async function relatedCandidates(article, keywords) {
  const feed = await getNews({ topic: article.topicId, limit: 250 })
  const sourceHost = new URL(article.sourceUrl).hostname.replace(/^www\./, '')
  const scored = feed.items.filter(item => new URL(item.sourceUrl).hostname.replace(/^www\./, '') !== sourceHost)
    .map(item => ({ item, score: keywords.filter(word => item.title.toLocaleLowerCase('ko').includes(word.toLocaleLowerCase('ko'))).length }))
    .filter(entry => entry.score > 0).sort((a, b) => b.score - a.score)
  return scored.slice(0, 4).map(entry => entry.item)
}
