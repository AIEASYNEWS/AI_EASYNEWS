import { useEffect, useState } from 'react'
import { apiRequest } from '../apis/client'
import type { RecommendedNewsResponse } from '../apis/news'

export function useRecommendedNews(enabled: boolean, preferencesKey: string) {
  const [version, setVersion] = useState(0)
  const key = `${preferencesKey}:${version}`
  const [state, setState] = useState<{ key: string; data?: RecommendedNewsResponse; error?: string }>({ key: '' })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const data = await apiRequest<RecommendedNewsResponse>('/recommendations', { signal: controller.signal })
        if (controller.signal.aborted) return
        setState({ key, data })
        if (!data.items.length) timer = setTimeout(load, data.waitingForCollection ? 30_000 : 5 * 60_000)
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, error: (error as Error).message })
      }
    }
    void load()
    return () => { clearTimeout(timer); controller.abort() }
  }, [key, enabled])
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: enabled && state.key !== key, retry: () => setVersion(value => value + 1) }
}
