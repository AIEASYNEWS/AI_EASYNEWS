import { useEffect, useState } from 'react'
import { getNews, type NewsResponse } from '../apis/news'
import type { TopicId } from '../types/onboarding'

export function useNewsFeed(query = '', topic: TopicId | '' = '', sort = 'latest', page = 1) {
  const [version, setVersion] = useState(0)
  const key = `${query}:${topic}:${sort}:${page}:${version}`
  const [state, setState] = useState<{ key: string; data?: NewsResponse; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    getNews({ query, topic, sort, page }, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data })
    }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }) })
    return () => controller.abort()
  }, [key, query, topic, sort, page])
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: state.key !== key, retry: () => setVersion(value => value + 1) }
}
