import type { TopicId } from './onboarding'

export type ViewerMode = 'guest' | 'member' | 'subscriber'

export interface NewsItem {
  id: string
  /** Catalog key used by the article screen; may differ from `id` when the URL had tracking parameters. */
  newsKey?: string
  topicId: TopicId
  title: string
  publisher: string
  publishedAt: string
  relativeTime?: string
  sourceUrl: string
  excerpt: string
  imageUrl?: string
}

export interface NewsArticle extends NewsItem {
  sourceLanguage?: string
  easyTitle: string
  easyParagraphs: string[]
  originalParagraphs: string[]
  summary: string[]
  background?: string
  glossary?: { term: string; meaning: string }[]
  changedCount?: number
}

export interface MatchResult {
  score: number
  grade: string
  interest: number
  personal: number
  timeliness: number
  matchedTags: string[]
  labels: string[]
}

export interface FeedItem extends NewsItem {
  topics: TopicId[]
  why: string
  difficult: boolean
  match: MatchResult
}

export interface FeedResponse {
  total: number
  matched: number
  items: FeedItem[]
  nickname: string
  summary: string[]
  hasInterests: boolean
  profileComplete: boolean
  waitingForCollection: boolean
  topReason: string | null
  region: { sido: string; sigungu: string } | null
  topicIds: TopicId[]
  customKeywords: string[]
}

export interface SimilarArticle { id: string; title: string; publisher: string; publishedAt: string; sourceUrl: string; excerpt: string }

export interface FeedDetail extends FeedItem {
  nickname: string
  reason: string | null
  region: { sido: string; sigungu: string } | null
  feedback: 'good' | 'bad' | null
  bookmarked: boolean
  converted: NewsArticle | null
}

export interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; quote?: string; offTopic?: boolean; createdAt: number }
export interface ChatArticle { id: string; title: string; publisher: string; publishedAt: string; topicId: TopicId; sourceUrl: string }
export interface ChatRoom { article: ChatArticle; createdAt: number; updatedAt: number; lastMessage?: { role: 'user' | 'assistant'; text: string } }
