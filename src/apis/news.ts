import type { NewsArticle, NewsItem } from '../types/news'
import type { TopicId } from '../types/onboarding'
import { apiRequest, ApiError } from './client'
import { getIdToken } from './firebase'

export interface NewsResponse { items: NewsItem[]; total: number; hasMore: boolean; source: 'catalog' }

export function getNews(options: { query?: string; topic?: TopicId | ''; sort?: string; page?: number } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams(Object.entries(options).map(([key, value]) => [key, String(value)]))
  return apiRequest<NewsResponse>(`/news?${params}`, { signal, authenticated: false })
}
export const getArticlePreview = (sourceUrl: string, signal?: AbortSignal) => apiRequest<NewsArticle>('/articles/preview', { method: 'POST', body: JSON.stringify({ sourceUrl }), signal, authenticated: false })
export const getSavedArticle = (id: string, signal?: AbortSignal) => apiRequest<NewsArticle>(`/articles/${encodeURIComponent(id)}`, { signal })
export const getHistory = (signal?: AbortSignal) => apiRequest<NewsItem[]>('/history', { signal })
export const getQuota = () => apiRequest<{ remaining: number | null; limit: number | null; unlimited?: boolean; subscriber?: boolean }>('/quota')

export async function convertArticle(sourceUrl: string, onProgress: (step: number) => void, signal: AbortSignal): Promise<NewsArticle> {
  const token = await getIdToken()
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sourceUrl }), signal })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new ApiError(error?.message || '기사 변환을 시작하지 못했어요.', error?.code)
  }
  if (!response.body) throw new ApiError('서버 응답을 읽지 못했어요.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const type = event.match(/^event: (.+)$/m)?.[1]
        const dataLine = event.match(/^data: (.+)$/m)?.[1]
        if (!dataLine) continue
        const data = JSON.parse(dataLine)
        if (type === 'progress') onProgress(data.step)
        if (type === 'error') throw new ApiError(data.message, data.code)
        if (type === 'result') return data as NewsArticle
      }
      if (done) break
    }
    throw new ApiError('변환 도중 연결이 끊어졌어요. 다시 시도해 주세요.')
  } finally { await reader.cancel().catch(() => {}) }
}
