import { JSDOM } from 'jsdom'
import { XMLParser } from 'fast-xml-parser'
import { articleId, inferTopic, cleanText } from './articles.js'
import { parsePublicUrl } from './safeFetch.js'
import { getConfig } from './config.js'
import { tagStoredNews } from './matching.js'
import { AppError } from './errors.js'
import { readStoredNews, storeNewsCandidates } from './newsCatalog.js'
import { adminServices } from './firebase.js'

const topicLabels = { jobs: '취업', economy: '경제', politics: '정치', society: '사회', technology: '과학 기술', youth: '청년정책', health: '건강 의료', culture: '문화', lifestyle: '생활' }
const naverHubQueries = { jobs: '취업 채용', youth: '청년 정책 지원', economy: '경제 정책', politics: '국회 정치', society: '사회 문제', culture: '문화예술', lifestyle: '생활 정보' }
const publisherNames = { 'yna.co.kr': '연합뉴스', 'news.sbs.co.kr': 'SBS 뉴스', 'imnews.imbc.com': 'MBC 뉴스', 'news.kbs.co.kr': 'KBS 뉴스', 'hani.co.kr': '한겨레', 'chosun.com': '조선일보', 'donga.com': '동아일보', 'kmib.co.kr': '국민일보', 'hankyung.com': '한국경제', 'mk.co.kr': '매일경제', 'khan.co.kr': '경향신문' }

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

export async function getNaverHubNews(topic, { clientId, clientSecret }, limit = 10) {
  const url = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news')
  const query = naverHubQueries[topic] || topicLabels[topic]
  url.search = new URLSearchParams({ query, display: String(limit), sort: 'date', format: 'json' }).toString()
  const unavailable = new AppError('NEWS_UNAVAILABLE', '네이버 뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
  let response
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
      headers: { 'X-NCP-APIGW-API-KEY-ID': clientId, 'X-NCP-APIGW-API-KEY': clientSecret },
    })
  } catch { throw unavailable }
  if ([401, 403].includes(response.status)) {
    throw new AppError('NAVER_HUB_AUTH_FAILED', '네이버 뉴스 검색 API 인증을 확인해 주세요.', 503)
  }
  if (!response.ok) throw unavailable
  const result = await response.json().catch(() => null)
  if (!Array.isArray(result?.items)) throw unavailable
  // Keep the search result order and the publisher's original URL.
  const items = result.items.flatMap(item => {
    const sourceUrl = item?.originallink || item?.link
    if (typeof sourceUrl !== 'string' || typeof item.title !== 'string') return []
    const article = itemFrom({ title: item.title, url: sourceUrl, date: item.pubDate, description: item.description, category: topic })
    return article ? [{ ...article, sourceUrl }] : []
  })
  return { items, total: items.length, hasMore: false, source: 'naver-hub' }
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

export async function collectNews(db = adminServices().db) {
  const { naverHub } = getConfig()
  if (!naverHub) throw new AppError('NEWS_NOT_CONFIGURED', '네이버 뉴스 검색 API 연결 설정을 확인해 주세요.', 503)
  const observedAt = Date.now()
  const topics = Object.keys(topicLabels)
  const results = await Promise.allSettled(topics.map(topic => getNaverHubNews(topic, naverHub, 35)))
  const feeds = results.filter(result => result.status === 'fulfilled')
  if (!feeds.length) throw results[0].reason
  const failedTopics = topics.filter((_, index) => results[index].status === 'rejected')
  if (failedTopics.length) console.warn('News collection failed for topics:', failedTopics.join(', '))
  const stored = await storeNewsCandidates(db, feeds.flatMap(feed => feed.value.items), observedAt)
  // Matching tags are optional: a missing or failing AI provider leaves rule-only scores.
  await tagStoredNews(db, stored, { limit: 160 }).catch(error => console.warn('News tagging failed:', error.code || error.name))
}

export async function getExploreNews({ query = '', topic = '', sort = 'latest', page = 1 } = {}, load = readStoredNews) {
  const { items } = await load()
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '')
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalize)
  const matches = items.filter(item => {
    if (topic && item.topicId !== topic) return false
    const text = normalize([item.title, item.publisher, item.excerpt].join(' '))
    return terms.every(term => text.includes(term))
  })
  if (sort === 'oldest') matches.reverse()
  const offset = (page - 1) * 24
  return { items: matches.slice(offset, offset + 24), total: matches.length, hasMore: offset + 24 < matches.length, source: 'catalog' }
}

/** Normalize known publisher subdomains without confusing unrelated .co.kr domains. */
export function publisherKey(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return Object.keys(publisherNames).find(domain => host === domain || host.endsWith(`.${domain}`)) || host.replace(/^(?:m|news)\./, '')
  } catch { return '' }
}
