import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { safeFetchText, parsePublicUrl, resolvePublicUrl } from './safeFetch.js'
import { AppError } from './errors.js'

export const articleId = url => createHash('sha256').update(url).digest('hex').slice(0, 32)
export const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim()

export function inferTopic(title) {
  const rules = [
    ['technology', /인공지능|반도체|과학|로봇|우주|데이터|소프트웨어|AI\b|IT\b/i],
    ['health', /건강|의료|병원|접종|의사|질병|치료|독감|암\s/],
    ['economy', /경제|금리|증시|주가|주식|부동산|환율|은행|수출|투자|물가|대출/],
    ['politics', /대통령|국회|정당|선거|외교|민주당|국민의힘|장관|의원/],
    ['culture', /문화|영화|드라마|공연|전시|작가|가수|음악|박물관/],
    ['lifestyle', /생활|날씨|여행|요리|음식|기온|소비자|패션/],
  ]
  return rules.find(([, expression]) => expression.test(title))?.[0] || 'society'
}

export function parseArticleHtml(html, sourceUrl) {
  const dom = new JSDOM(html, { url: sourceUrl })
  try {
    const document = dom.window.document
    const meta = selector => document.querySelector(selector)?.getAttribute('content')?.trim() || ''
    let imageUrl
    try { const image = meta('meta[property="og:image"]'); if (image) imageUrl = parsePublicUrl(new URL(image, sourceUrl).href).href } catch { /* 잘못된 이미지 주소는 생략한다. */ }
    const published = meta('meta[property="article:published_time"]') || meta('meta[name="pubdate"]') || meta('meta[name="date"]')
    const article = new Readability(document.cloneNode(true), { charThreshold: 100 }).parse()
    if (!article?.title || cleanText(article.textContent).length < 120) throw new AppError('ARTICLE_UNREADABLE', '기사 본문을 읽지 못했어요. 로그인 없이 볼 수 있는 원문 기사 주소로 시도해 주세요.', 422)
    const parsed = new JSDOM(article.content).window
    for (const element of parsed.document.querySelectorAll('audio,video,script,style,noscript,button')) element.remove()
    for (const element of parsed.document.querySelectorAll('br')) element.replaceWith(parsed.document.createTextNode('\n'))
    for (const element of parsed.document.querySelectorAll('p,div,section,li,blockquote,h2,h3')) element.append('\n\n')
    const paragraphs = parsed.document.body.textContent.split(/\n+/).map(cleanText).filter(text => text.length > 8)
    parsed.close()
    const originalParagraphs = paragraphs.length ? paragraphs : [cleanText(article.textContent)]
    if (originalParagraphs.join('\n').length > 40_000) throw new AppError('ARTICLE_TOO_LONG', '기사가 너무 길어요. 더 짧은 기사 주소로 시도해 주세요.', 422)
    return {
      id: articleId(sourceUrl), topicId: inferTopic(article.title), title: cleanText(article.title), easyTitle: cleanText(article.title),
      publisher: article.siteName || meta('meta[property="og:site_name"]') || new URL(sourceUrl).hostname.replace(/^www\./, ''),
      publishedAt: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : '',
      sourceUrl, ...(imageUrl ? { imageUrl } : {}),
      excerpt: originalParagraphs.join(' ').slice(0, 700), originalParagraphs,
      easyParagraphs: [], summary: [], comparison: '', reports: [],
    }
  } finally { dom.window.close() }
}

export async function readArticle(sourceUrl, signal) {
  const checkedUrl = parsePublicUrl(sourceUrl)
  const { text, url } = await safeFetchText(checkedUrl.href, { signal })
  const article = parseArticleHtml(text, url)
  if (article.imageUrl) {
    try { await resolvePublicUrl(article.imageUrl) } catch { delete article.imageUrl }
  }
  return article
}
