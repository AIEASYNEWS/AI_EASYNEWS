import type { ViewerMode } from './news'

export type AppPage = 'home' | 'welcome' | 'topics' | 'interests' | 'converting' | 'preview' | 'article'

export interface AppRoute {
  page: AppPage
  articleId?: string
  viewer?: ViewerMode
  original?: boolean
}
