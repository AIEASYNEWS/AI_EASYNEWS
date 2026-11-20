import type { TopicId } from './onboarding'

export type ViewerMode = 'guest' | 'member' | 'subscriber'

export interface RelatedReport {
  id: string
  publisher: string
  title: string
  focus: string
  summary?: string[]
  kind: 'same-event' | 'different-perspective'
  relation?: 'opposing' | 'alternative'
  koreanTitle?: string
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
  sourceLanguage?: string
  easyTitle: string
  easyParagraphs: string[]
  originalParagraphs: string[]
  summary: string[]
  comparison: string
  reports: RelatedReport[]
  originalFocus?: string
  sourcePositions?: { speaker: string; evidence: string }[]
  comparisonStatus?: 'pending' | 'ready' | 'partial' | 'search-unavailable' | 'no-candidates' | 'read-failed' | 'no-distinct-perspective' | 'evidence-unverified' | 'analysis-failed' | 'timeout'
  comparisonPlan?: { revision: string }
  comparisonNotice?: string
}
