import { useSyncExternalStore } from 'react'
import type { AppPage, AppRoute } from '../types/navigation'

const paths: Record<AppPage, string> = {
  notifications: '/notifications', notificationSettings: '/settings/notifications', subscription: '/subscription',
  home: '/home', welcome: '/onboarding', topics: '/onboarding/topics',
  interests: '/onboarding/interests', converting: '/converting',
  preview: '/articles/preview', article: '/articles/read',
  login: '/login', signup: '/signup', explore: '/explore', my: '/my',
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

const getHash = () => window.location.hash

export function useAppNavigation() {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const url = new URL(hash.slice(1) || '/home', window.location.origin)
  const page = (Object.keys(paths) as AppPage[]).find((key) => paths[key] === url.pathname) ?? 'home'
  const viewer = url.searchParams.get('viewer')
  const route: AppRoute = {
    page,
    from: (Object.keys(paths) as AppPage[]).find(key => key === url.searchParams.get('from')),
    relatedTitle: url.searchParams.get('related') ?? undefined,
    articleId: url.searchParams.get('id') ?? undefined,
    viewer: viewer === 'guest' || viewer === 'member' || viewer === 'subscriber' ? viewer : undefined,
    original: url.searchParams.get('tab') === 'original',
    sourceUrl: url.searchParams.get('url') ?? undefined,
  }

  function navigate(nextPage: AppPage, options: Omit<AppRoute, 'page'> = {}) {
    const params = new URLSearchParams()
    if (options.from) params.set('from', options.from)
    if (options.relatedTitle) params.set('related', options.relatedTitle)
    if (options.articleId) params.set('id', options.articleId)
    if (options.original) params.set('tab', 'original')
    if (options.sourceUrl) params.set('url', options.sourceUrl)
    window.location.hash = `${paths[nextPage]}${params.size ? `?${params}` : ''}`
  }

  return { route, navigate }
}
