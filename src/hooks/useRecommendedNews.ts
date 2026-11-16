import { useEffect, useState } from 'react'
import { apiRequest } from '../apis/client'
import type { NewsResponse } from '../apis/news'

export function useRecommendedNews(enabled: boolean, preferencesKey: string) {
  const [version, setVersion] = useState(0)
  const key = `${preferencesKey}:${version}`
  const [state, setState] = useState<{ key: string; data?: NewsResponse; error?: string }>({ key: '' })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    apiRequest<NewsResponse>('/recommendations', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ key, data })
    }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }) })
    return () => controller.abort()
  }, [key, enabled])
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: enabled && state.key !== key, retry: () => setVersion(value => value + 1) }
}
