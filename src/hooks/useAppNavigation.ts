import { useSyncExternalStore } from 'react'
import type { AppPage, AppRoute } from '../types/navigation'

const paths: Record<AppPage, string> = {
  home: '/home', welcome: '/onboarding', login: '/login', signup: '/signup',
  profile: '/settings/profile', interests: '/settings/interests',
  article: '/articles/read', chat: '/chat', chats: '/chats', subscription: '/subscription', explore: '/explore', my: '/my', matches: '/matches', notifications: '/notifications',
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

const getHash = () => window.location.hash

function href(nextPage: AppPage, options: Omit<AppRoute, 'page'> = {}) {
  const params = new URLSearchParams()
  if (options.from) params.set('from', options.from)
  if (options.articleId) params.set('id', options.articleId)
  if (options.tab === 'easy') params.set('tab', 'easy')
  return `#${paths[nextPage]}${params.size ? `?${params}` : ''}`
}
export function navigate(nextPage: AppPage, options: Omit<AppRoute, 'page'> = {}) { window.location.hash = href(nextPage, options) }
export function replace(nextPage: AppPage, options: Omit<AppRoute, 'page'> = {}) {
  window.history.replaceState(null, '', href(nextPage, options))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useAppNavigation() {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const url = new URL(hash.slice(1) || '/home', window.location.origin)
  const page = (Object.keys(paths) as AppPage[]).find((key) => paths[key] === url.pathname) ?? 'home'
  const route: AppRoute = {
    page,
    from: (Object.keys(paths) as AppPage[]).find(key => key === url.searchParams.get('from')),
    articleId: url.searchParams.get('id') ?? undefined,
    tab: url.searchParams.get('tab') === 'easy' ? 'easy' : 'original',
  }

  return { route, navigate, replace }
}
