import type { TopicId } from './onboarding'

export type ViewerMode = 'guest' | 'member' | 'subscriber'

export interface RelatedReport {
  id: string
  publisher: string
  title: string
  focus: string
  kind: 'same-event' | 'different-perspective'
}

export interface NewsArticle {
  id: string
  topicId: TopicId
  title: string
  easyTitle: string
  publisher: string
  publishedAt: string
  relativeTime: string
  sourceUrl: string
  excerpt: string
  easyParagraphs: string[]
  originalParagraphs: string[]
  summary: string[]
  comparison: string
  reports: RelatedReport[]
}
