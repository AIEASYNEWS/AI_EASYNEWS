import type { TopicId } from './onboarding'

export type ViewerMode = 'guest' | 'member' | 'subscriber'

export interface RelatedReport {
  id: string
  publisher: string
  title: string
  focus: string
  kind: 'same-event' | 'different-perspective'
  viewpoint?: string
  originalEvidence?: string
  relatedEvidence?: string
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
  originalFocus?: string
  comparisonStatus?: 'ready' | 'partial' | 'search-unavailable' | 'no-candidates' | 'read-failed' | 'no-distinct-perspective' | 'analysis-failed' | 'timeout'
  comparisonNotice?: string
}
