import { useState } from 'react'
import { NewsListItem } from '../components/explore/NewsListItem'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { RequestState } from '../components/ui/RequestState'
import { TOPICS } from '../constants/topics'
import { useNewsFeed } from '../hooks/useNewsFeed'
import type { NewsItem } from '../types/news'
import type { TopicId } from '../types/onboarding'

const categories = ['', 'politics', 'economy', 'society', 'lifestyle', 'technology', 'health', 'culture'] as const
export function ExplorePage({ onHome, onMyPage, onNotifications, onArticle }: { onHome: () => void; onMyPage: () => void; onNotifications: () => void; onArticle: (article: NewsItem) => void }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const { data, loading, error, retry } = useNewsFeed(query, topic, sort, page)
  return <PageLayout title="탐색" header={<><h1 className="text-xl leading-7 font-bold">탐색</h1><button type="button" aria-label="알림" onClick={onNotifications} className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-2"><Icon name="bell" /></button></>} contentClassName="px-5 pt-1 pb-6" footer={<BottomNavigation active="explore" onHome={onHome} onExplore={() => document.querySelector('main')?.scrollTo({ top: 0 })} onMyPage={onMyPage} />}>
    <form role="search" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); setPage(1) }} className="flex h-12 items-center gap-2 rounded-lg border border-[#cccccc] px-3">
      <input type="search" aria-label="뉴스 검색" maxLength={100} value={input} onChange={event => setInput(event.target.value)} placeholder="궁금한 뉴스나 키워드 검색" className="min-w-0 flex-1 text-sm leading-[21px] outline-none placeholder:text-[#777777]" />
      <button type="submit" className="cursor-pointer text-sm font-medium focus-visible:outline-2">검색</button>
    </form>
    <div aria-label="뉴스 카테고리" className="-mr-5 mt-6 flex gap-2 overflow-x-auto pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map(id => <button key={id} type="button" aria-pressed={topic === id} onClick={() => { setTopic(id); setPage(1) }} className={`h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-sm leading-[21px] focus-visible:outline-2 focus-visible:-outline-offset-2 ${topic === id ? 'border-[#333333] bg-[#333333] text-white' : 'border-[#cccccc] text-[#333333]'}`}>{id ? TOPICS.find(item => item.id === id)?.label : '전체'}</button>)}</div>
    <div className="mt-8 flex items-center justify-between gap-2"><h2 className="text-lg leading-[26px] font-bold">{query ? `‘${query}’ 검색 결과` : `${topic ? TOPICS.find(item => item.id === topic)?.label : '전체'} 뉴스`}</h2><select aria-label="뉴스 정렬" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }} className="max-w-24 cursor-pointer bg-white text-xs leading-[18px] text-[#777777]"><option value="latest">최신순</option><option value="oldest">오래된순</option></select></div>
    <div className="mt-4">{loading || error ? <RequestState loading={loading} error={error} onRetry={retry} /> : data?.items.length ? data.items.map(article => <NewsListItem key={article.id} article={article} onClick={() => onArticle(article)} />) : <RequestState empty="검색 결과가 없어요. 다른 키워드로 검색해 보세요." />}</div>
    {data?.source === 'gdelt' && <p className="mt-4 text-xs leading-[18px] text-[#777777]">최근 72시간에 수집된 뉴스 제목과 언론사에서 검색해요.</p>}
    {(page > 1 || data?.hasMore) && <div className="mt-6 flex items-center gap-3"><Button variant="secondary" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>이전</Button><span className="text-sm">{page}</span><Button variant="secondary" disabled={!data?.hasMore || loading} onClick={() => setPage(value => value + 1)}>다음</Button></div>}
  </PageLayout>
}
