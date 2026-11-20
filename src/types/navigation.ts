export type AppPage = 'home' | 'welcome' | 'login' | 'signup' | 'profile' | 'interests' | 'article' | 'chat' | 'chats' | 'subscription'

export interface AppRoute {
  page: AppPage
  from?: AppPage
  articleId?: string
  tab?: 'original' | 'easy'
}
