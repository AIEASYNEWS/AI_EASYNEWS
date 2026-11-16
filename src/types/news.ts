import type { TopicId } from './onboarding'

export type ViewerMode = 'guest' | 'member' | 'subscriber'

export interface RelatedReport {
  id: string
  publisher: string
  title: string
  focus: string
  kind: 'same-event' | 'different-perspective'
  sourceUrl?: string
  publishedAt?: string
}

export interface NewsItem {
  id: string
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
  easyTitle: string
  easyParagraphs: string[]
  originalParagraphs: string[]
  summary: string[]
  comparison: string
  reports: RelatedReport[]
  comparisonNotice?: string
}
