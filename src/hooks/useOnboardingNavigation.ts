import { useSyncExternalStore } from 'react'
import type { OnboardingRoute } from '../types/onboarding'

const routes: Record<OnboardingRoute, string> = {
  welcome: '#/onboarding',
  topics: '#/onboarding/topics',
  interests: '#/onboarding/interests',
}

function getRoute(): OnboardingRoute {
  if (window.location.hash === routes.interests) return 'interests'
  if (window.location.hash === routes.topics) return 'topics'
  return 'welcome'
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useOnboardingNavigation() {
  const page = useSyncExternalStore(subscribe, getRoute, () => 'welcome' as const)

  return {
    page,
    navigate: (nextPage: OnboardingRoute) => {
      window.location.hash = routes[nextPage]
    },
  }
}
