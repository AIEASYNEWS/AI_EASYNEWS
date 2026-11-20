import { useEffect, useState } from 'react'
import { getFeed } from '../apis/feed'
import { ChatFab } from '../components/v2/Character'
import { Skeleton } from '../components/v2/Controls'
import { Screen } from '../components/v2/Screen'
import { LineIcon } from '../components/ui/LineIcon'
import { RequestState } from '../components/ui/RequestState'
import { topicLabel } from '../constants/topics'
import type { FeedResponse } from '../types/news'
import { FeedCard } from './HomePage'

/** A2-2 맞춤 기사 전체: every matched story, best first, filterable by field. */
export function MatchesPage({ onBack, onArticle, onChats }: { onBack: () => void; onArticle: (id: string) => void; onChats: () => void }) {
  const [feed, setFeed] = useState<FeedResponse>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    getFeed(controller.signal).then(value => { if (!controller.signal.aborted) setFeed(value) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])
  const topics = [...new Set(feed?.items.map(item => item.topics[0]) ?? [])]
  const items = feed?.items.filter(item => filter === 'all' || item.topics[0] === filter) ?? []
  return <Screen pageTitle="맞춤 기사" heading="맞춤 기사" onBack={onBack} contentClassName="px-5 pt-2" overlay={<ChatFab onClick={onChats} label="토리 대화 기록" />}>
    {error ? <RequestState error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} />
      : !feed ? <div role="status" aria-label="맞춤 기사를 불러오고 있어요" className="space-y-3"><Skeleton className="h-[52px] w-full rounded-xl" />{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-[150px] w-full rounded-xl" />)}</div>
        : <>
          <p className="rounded-xl bg-surface px-4 py-[15px] text-sm text-secondary">오늘 들어온 기사 {feed.total.toLocaleString()}건 중 {feed.matched}건이 잘 맞아요</p>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-secondary">매칭률 높은 순</h2>
            <label className="relative flex h-9 items-center rounded-full border border-border bg-white pr-8 pl-3 text-sm font-medium text-ink">
              <span className="sr-only">분야 고르기</span>
              <select value={filter} onChange={event => setFilter(event.target.value)} className="cursor-pointer appearance-none bg-transparent">
                <option value="all">전체 {feed.items.length}</option>
                {topics.map(topic => <option key={topic} value={topic}>{topicLabel(topic)} {feed.items.filter(item => item.topics[0] === topic).length}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3"><LineIcon name="down" size={16} /></span>
            </label>
          </div>
          {items.length ? <ul className="mt-3 flex flex-col gap-4 pb-24">{items.map(item => <FeedCard key={item.id} item={item} onOpen={() => onArticle(item.id)} />)}</ul>
            : <p className="py-16 text-center text-sm text-muted">오늘은 잘 맞는 기사가 없어요.</p>}
        </>}
  </Screen>
}
