import { useEffect, useState, type ReactNode } from 'react'
import { getFeed } from '../apis/feed'
import { ChatFab } from '../components/v2/Character'
import { PillButton, TopicLabel } from '../components/v2/Controls'
import { Screen } from '../components/v2/Screen'
import { LineIcon, type LineIconName } from '../components/ui/LineIcon'
import { RequestState } from '../components/ui/RequestState'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { topicLabel } from '../constants/topics'
import type { FeedItem, FeedResponse } from '../types/news'
import { relativeTime } from '../utils/date'

export function MatchBadge({ score }: { score: number }) {
  return <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-bold ${score >= 80 ? 'bg-brand text-white' : 'bg-brand-soft text-brand'}`}>{score}% 매칭</span>
}

function FeedCard({ item, onOpen }: { item: FeedItem; onOpen: () => void }) {
  return <li>
    <button type="button" onClick={onOpen} className="block w-full cursor-pointer rounded-xl border border-line bg-white p-4 text-left hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-brand">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">{item.topics.map(topic => <TopicLabel key={topic}>{topicLabel(topic)}</TopicLabel>)}</div>
        <MatchBadge score={item.match.score} />
      </div>
      <h3 className="mt-2 line-clamp-2 text-[15px] leading-[22px] font-bold break-keep">{item.title}</h3>
      {item.why && <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-secondary"><strong className="font-bold">왜 필요해요?</strong> {item.why}</p>}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{item.publisher} · {relativeTime(item.publishedAt)}</span>
        {item.difficult && <span className="shrink-0 rounded-full border border-line px-2 leading-5 text-secondary">쉬운말 가능</span>}
      </div>
    </button>
  </li>
}

function EmptyState({ icon, title, body, action }: { icon: LineIconName; title: string; body: string; action: ReactNode }) {
  return <div className="flex flex-col items-center px-4 pt-16 pb-24 text-center">
    <span className="flex size-14 items-center justify-center rounded-full bg-surface text-secondary"><LineIcon name={icon} /></span>
    <p className="mt-4 text-[15px] font-bold">{title}</p>
    <p className="mt-2 text-[13px] leading-5 whitespace-pre-line text-muted">{body}</p>
    <div className="mt-5">{action}</div>
  </div>
}

/** A2 홈: today's stories ranked by match rate. */
export function HomePage({ member, onArticle, onInterests, onProfile, onChats, onLogin, onExplore, onMyPage }: { member: boolean; onArticle: (id: string) => void; onInterests: () => void; onProfile: () => void; onChats: () => void; onLogin: () => void; onExplore: () => void; onMyPage: () => void }) {
  const [feed, setFeed] = useState<FeedResponse>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    getFeed(controller.signal).then(value => { if (!controller.signal.aborted) { setFeed(value); setError('') } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])
  const name = feed?.nickname ? `${feed.nickname}님께` : '나에게'
  const topics = [...new Set(feed?.items.flatMap(item => item.topics.slice(0, 1)) ?? [])]
  const items = feed?.items.filter(item => filter === 'all' || item.topics[0] === filter) ?? []

  let body
  if (error) body = <RequestState error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} />
  else if (!feed) body = <RequestState loading />
  else if (!feed.hasInterests) body = <EmptyState icon="tag" title="관심 분야를 고르면 맞춤 뉴스를 찾아 드려요" body="관심 있는 분야를 하나 이상 골라 주세요."
    action={<PillButton className="h-11 px-6 text-sm" onClick={onInterests}>분야 고르기</PillButton>} />
  else if (!feed.items.length) body = <EmptyState icon="doc" title="오늘은 잘 맞는 기사가 없어요" body={feed.waitingForCollection ? '아직 들어온 기사가 없어요.\n기사가 들어오면 다시 찾아 드릴게요.' : '새 기사가 들어오면 다시 찾아 드릴게요.\n관심 분야를 넓혀 보는 것도 좋아요.'}
    action={<PillButton variant="outline" className="h-10 px-5 text-[13px]" onClick={onInterests}>관심 분야 수정</PillButton>} />
  else body = <>
    <section className="mt-4 rounded-xl bg-surface p-4">
      <p className="text-[15px] leading-[22px] font-bold break-keep">오늘 들어온 기사 {feed.total.toLocaleString()}건 중 {feed.matched}건이 {feed.nickname ? `${feed.nickname}님과` : '나와'} 잘 맞아요</p>
      <button type="button" onClick={onInterests} className="mt-3 h-8 cursor-pointer rounded-full border border-slate-300 bg-white px-3 text-[13px] font-medium text-secondary hover:bg-white/60">관심 분야 수정</button>
    </section>
    <section aria-labelledby="ranked-heading" className="mt-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 id="ranked-heading" className="text-base font-bold">매칭률 높은 순</h2>
        <label className="relative flex items-center gap-1 text-[13px] text-secondary">
          <span className="sr-only">분야 고르기</span>
          <select value={filter} onChange={event => setFilter(event.target.value)} className="cursor-pointer appearance-none bg-transparent pr-5 text-right">
            <option value="all">전체 {feed.items.length}</option>
            {topics.map(topic => <option key={topic} value={topic}>{topicLabel(topic)} {feed.items.filter(item => item.topics[0] === topic).length}</option>)}
          </select>
          <span className="pointer-events-none absolute right-0"><LineIcon name="down" size={14} /></span>
        </label>
      </div>
      <ul className="mt-3 flex flex-col gap-3">{items.map(item => <FeedCard key={item.id} item={item} onOpen={() => onArticle(item.id)} />)}</ul>
    </section>
  </>

  return <Screen pageTitle="홈" contentClassName="px-5" overlay={<ChatFab aboveNavigation onClick={onChats} label="소식이 대화 기록" />}
    footer={<BottomNavigation active="home" onHome={() => document.querySelector('main')?.scrollTo({ top: 0 })} onExplore={onExplore} onMyPage={onMyPage} />}>
    <div className="flex h-14 items-center justify-between">
      <img src="/images/home/aleum-logo.svg" alt="aleum" width="96" height="32" className="h-7 w-auto" />
      {!member && <button type="button" onClick={onLogin} className="cursor-pointer text-[13px] font-medium text-secondary underline">로그인</button>}
    </div>
    <h1 className="mt-2 text-[22px] leading-[30px] font-bold">{name} 맞는 뉴스</h1>
    {feed && (feed.summary.length || feed.profileComplete
      ? <p className="mt-1 text-xs leading-[18px] text-muted">{feed.summary.join(' · ')}</p>
      : null)}
    {feed && !feed.profileComplete && <button type="button" onClick={onProfile} className="mt-1 cursor-pointer text-left text-xs leading-[18px] text-brand underline">나이·직종을 알려 주면 더 잘 맞는 뉴스를 찾아 드려요</button>}
    {body}
  </Screen>
}
