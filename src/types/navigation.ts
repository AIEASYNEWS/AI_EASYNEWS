import type { ViewerMode } from './news'

export type AppPage = 'home' | 'welcome' | 'login' | 'signup' | 'explore' | 'my' | 'topics' | 'interests' | 'converting' | 'preview' | 'article' | 'notifications' | 'notificationSettings' | 'subscription'

export interface AppRoute {
  page: AppPage
  from?: AppPage
  relatedTitle?: string
  articleId?: string
  viewer?: ViewerMode
  original?: boolean
  comparison?: boolean
  sourceUrl?: string
}
