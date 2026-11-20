import { useEffect, useState, type ReactNode } from 'react'
import { getFeed } from '../apis/feed'
import { getNotifications } from '../apis/account'
import { saveProfile } from '../apis/profile'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { ChatFab } from '../components/v2/Character'
import { PillButton, Skeleton, Toast, TopicLabel } from '../components/v2/Controls'
import { RegionSheet } from '../components/v2/RegionSheet'
import { Screen } from '../components/v2/Screen'
import { Dialog } from '../components/ui/Dialog'
import { LineIcon, type LineIconName } from '../components/ui/LineIcon'
import { RequestState } from '../components/ui/RequestState'
import { topicLabel } from '../constants/topics'
import type { Region } from '../constants/regions'
import { useAccountResource } from '../hooks/useAccountResource'
import type { FeedItem, FeedResponse } from '../types/news'
import { relativeTime } from '../utils/date'
import { emptyDraft, type ProfileDraft } from '../utils/profileDraft'
import { InterestFields } from './ProfileSteps'

export function MatchBadge({ score, soft }: { score: number; soft?: boolean }) {
  return <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-bold ${score >= 80 && !soft ? 'bg-brand text-white' : 'bg-brand-100 text-brand'}`}>{score}% 매칭</span>
}

export function EasyBadge() {
  return <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-white px-2 text-xs font-medium text-secondary">쉬운말 가능</span>
}

/** Article image with a skeleton while it loads and a placeholder icon when there is none. */
export function Thumb({ src, className = '', iconSize = 24 }: { src?: string; className?: string; iconSize?: number }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const show = src && state !== 'failed'
  return <div aria-hidden="true" className={`relative flex items-center justify-center overflow-hidden bg-[#eaf0f7] text-subtle ${className}`}>
    {show && state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
    {show ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onLoad={() => setState('loaded')} onError={() => setState('failed')}
      className={`size-full object-cover transition-opacity ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`} /> : <LineIcon name="image" size={iconSize} />}
  </div>
}

function Meta({ item }: { item: FeedItem }) {
  return <div className="flex items-center gap-2 text-xs text-subtle"><span className="truncate">{item.publisher} · {relativeTime(item.publishedAt)}</span>{item.difficult && <EasyBadge />}</div>
}

/** A2-2 card: topic + match labels, badge, title, why, meta. */
export function FeedCard({ item, onOpen }: { item: FeedItem; onOpen: () => void }) {
  return <li>
    <button type="button" onClick={onOpen} className="block w-full cursor-pointer rounded-xl border border-border bg-white p-4 text-left hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-brand">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">{item.topics.map(topic => <TopicLabel key={topic}>{topicLabel(topic)}</TopicLabel>)}
          {item.match.labels.filter(label => label !== '내 상황 일치').map(label => <TopicLabel key={label}>{label}</TopicLabel>)}</div>
        <MatchBadge score={item.match.score} soft={item.match.score < 80} />
      </div>
      <h3 className="mt-2 line-clamp-2 text-base leading-6 font-bold break-keep">{item.title}</h3>
      {item.why && <p className="mt-1 line-clamp-2 text-sm leading-[21px] text-secondary"><strong className="font-bold">왜 필요해요?</strong> {item.why}</p>}
      <div className="mt-2"><Meta item={item} /></div>
    </button>
  </li>
}

function EmptyState({ icon, title, body, action }: { icon: LineIconName; title: string; body: string; action: ReactNode }) {
  return <div className="flex flex-col items-center px-4 pt-14 pb-24 text-center">
    <span className="flex size-14 items-center justify-center rounded-full bg-surface text-secondary"><LineIcon name={icon} /></span>
    <p className="mt-4 text-[15px] font-bold">{title}</p>
    <p className="mt-2 text-[13px] leading-5 whitespace-pre-line text-muted">{body}</p>
    <div className="mt-5">{action}</div>
  </div>
}

function HomeSkeleton() {
  return <div role="status" aria-label="맞춤 뉴스를 불러오고 있어요" className="pb-24">
    <Skeleton className="mt-2 h-6 w-40" />
    <div className="mt-3 overflow-hidden rounded-xl border border-border"><Skeleton className="h-[197px] w-full rounded-none" />
      <div className="space-y-2 p-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-16 w-full rounded-lg" /></div></div>
    {[0, 1, 2].map(index => <div key={index} className="flex gap-4 border-b border-line py-4"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-24" /></div><Skeleton className="size-20 rounded-none" /></div>)}
  </div>
}

/** A2-1 매칭 키워드 편집 (bottom sheet). */
function KeywordSheet({ initial, onClose, onSaved }: { initial: ProfileDraft; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const count = draft.topicIds.length + draft.customKeywords.length
  async function save() {
    setPending(true); setError('')
    try { await saveProfile({ topicIds: draft.topicIds, customKeywords: draft.customKeywords, completed: true }); onSaved() }
    catch (cause) { setError((cause as Error).message) } finally { setPending(false) }
  }
  return <Dialog open labelledBy="keyword-sheet-title" onClose={onClose} sheet className="flex max-h-[90svh]! flex-col overflow-hidden! px-0! pt-2! pb-0!">
    <span aria-hidden="true" className="mx-auto block h-1 w-9 shrink-0 rounded-full bg-[#d5dce5]" />
    <div className="flex shrink-0 items-center justify-between px-5 pt-4">
      <h2 id="keyword-sheet-title" className="text-lg font-bold">매칭 키워드 편집</h2>
      <button type="button" aria-label="닫기" onClick={onClose} className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-surface"><LineIcon name="close" /></button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
      <p className="mt-2 text-sm text-muted">고른 키워드로 기사를 찾아 매칭률을 알려 드려요.</p>
      <InterestFields draft={draft} onChange={change => { setDraft(value => ({ ...value, ...change })); setError('') }} noun="키워드" />
    </div>
    <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
      <p className={`mb-2 text-center text-xs ${error ? 'text-red-600' : 'text-muted'}`} role={error ? 'alert' : undefined}>{error || `${count}개 골랐어요`}</p>
      <PillButton className="w-full" disabled={!count || pending} onClick={save}>{pending ? '저장하고 있어요' : '저장하기'}</PillButton>
    </div>
  </Dialog>
}

interface HomePageProps {
  member: boolean; onArticle: (id: string) => void; onProfile: () => void; onChats: () => void; onLogin: () => void
  onExplore: () => void; onMyPage: () => void; onMore: () => void; onNotifications: () => void
}

/** A2 홈: location chip, matching keywords, the top story and the next ones. */
export function HomePage({ member, onArticle, onProfile, onChats, onLogin, onExplore, onMyPage, onMore, onNotifications }: HomePageProps) {
  const [feed, setFeed] = useState<FeedResponse>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [sheet, setSheet] = useState<'keywords' | 'region'>()
  const [toast, setToast] = useState<{ title: string; body?: string }>()
  const [regionSaving, setRegionSaving] = useState(false)
  const notifications = useAccountResource(getNotifications)
  const unread = notifications.value?.some(item => !item.read)
  useEffect(() => {
    const controller = new AbortController()
    getFeed(controller.signal).then(value => { if (!controller.signal.aborted) { setFeed(value); setError('') } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])
  const reload = () => { setFeed(undefined); setVersion(value => value + 1) }

  async function changeRegion(region: Region) {
    setRegionSaving(true)
    try {
      await saveProfile({ region })
      setSheet(undefined); reload()
      setToast({ title: `사는 지역을 ${region.sigungu}로 바꿨어요.`, body: '새로 찾은 기사를 보여 드려요.' })
    } catch (cause) { setToast({ title: '사는 지역을 바꾸지 못했어요.', body: (cause as Error).message }) } finally { setRegionSaving(false) }
  }

  const keywords = feed ? [...feed.topicIds.map(topicLabel), ...feed.customKeywords] : []
  const [top, ...rest] = feed?.items ?? []
  let body
  if (error) body = <RequestState error={error} onRetry={reload} />
  else if (!feed) body = <HomeSkeleton />
  else if (!keywords.length) body = <EmptyState icon="tag" title="관심 분야를 고르면 맞춤 뉴스를 찾아 드려요" body="관심 있는 분야를 하나 이상 골라 주세요."
    action={<PillButton className="h-11 px-6 text-sm" onClick={() => setSheet('keywords')}>분야 고르기</PillButton>} />
  else if (!top) body = <EmptyState icon="doc" title="오늘은 잘 맞는 기사가 없어요" body={feed.waitingForCollection ? '아직 들어온 기사가 없어요.\n기사가 들어오면 다시 찾아 드릴게요.' : '새 기사가 들어오면 다시 찾아 드릴게요.\n매칭 키워드를 넓혀 보는 것도 좋아요.'}
    action={<PillButton variant="outline" className="h-10 px-5 text-[13px]" onClick={() => setSheet('keywords')}>매칭 키워드 편집</PillButton>} />
  else body = <>
    <section aria-labelledby="top-heading" className="mt-[26px]">
      <div className="flex items-center justify-between"><h2 id="top-heading" className="text-lg leading-[26px] font-bold">나를 위한 추천 기사</h2><span className="text-sm font-medium text-muted">매칭률 높은 순</span></div>
      <p className="text-xs leading-[18px] text-subtle">오늘 들어온 기사 {feed.total.toLocaleString()}건 중 {feed.matched}건이 잘 맞아요</p>
      <button type="button" onClick={() => onArticle(top.id)} className="mt-2 block w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-white text-left focus-visible:outline-2 focus-visible:outline-brand">
        <Thumb src={top.imageUrl} className="h-[197px] w-full" />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">{top.match.labels.map(label => <TopicLabel key={label}>{label}</TopicLabel>)}<MatchBadge score={top.match.score} /></div>
          <h3 className="line-clamp-2 text-base leading-6 font-bold break-keep">{top.title}</h3>
          <Meta item={top} />
          {(feed.topReason || top.why) && <div className="rounded-lg bg-surface p-3">
            <p className="flex items-center gap-2 text-sm font-bold"><LineIcon name="spark" size={16} />이 기사가 추천된 이유</p>
            <p className="mt-1 text-sm leading-[21px] text-secondary">{feed.topReason || top.why}</p>
          </div>}
        </div>
      </button>
    </section>
    {rest.length > 0 && <section aria-labelledby="next-heading" className="mt-[26px]">
      <h2 id="next-heading" className="text-xl leading-[26px] font-bold">이어서 볼 맞춤 기사</h2>
      <ul className="mt-2">{rest.slice(0, 3).map((item, index) => <li key={item.id} className={index < Math.min(rest.length, 3) - 1 ? 'border-b border-line' : ''}>
        <button type="button" onClick={() => onArticle(item.id)} className="flex w-full cursor-pointer gap-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-brand">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-xs leading-[18px] font-medium text-muted"><strong className="font-bold text-ink">{item.match.score}%</strong>{[topicLabel(item.topics[0]), ...item.match.labels.slice(0, 1)].map(text => ` · ${text}`).join('')}</p>
            <h3 className="line-clamp-2 text-base leading-6 font-bold break-keep">{item.title}</h3>
            <Meta item={item} />
          </div>
          <Thumb src={item.imageUrl} className="size-20 shrink-0" />
        </button>
      </li>)}</ul>
    </section>}
    {feed.items.length > 1 && <button type="button" onClick={onMore} className="mt-2 mb-20 flex h-12 w-full cursor-pointer items-center justify-center gap-1 text-sm font-medium text-secondary">맞춤 기사 더 보기<LineIcon name="next" size={16} /></button>}
  </>

  const initialDraft: ProfileDraft = { ...emptyDraft, topicIds: feed?.topicIds ?? [], customKeywords: feed?.customKeywords ?? [] }
  return <>
    <Screen pageTitle="홈" contentClassName="px-5 pt-2"
      overlay={<>{toast && <Toast {...toast} />}<ChatFab aboveNavigation onClick={onChats} label="소식이 대화 기록" /></>}
      footer={<BottomNavigation active="home" onHome={() => document.querySelector('main')?.scrollTo({ top: 0 })} onExplore={onExplore} onMyPage={onMyPage} />}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSheet('region')} aria-label={feed?.region ? `사는 지역 ${feed.region.sigungu}, 바꾸기` : '사는 지역 고르기'}
              className="flex h-8 cursor-pointer items-center gap-1 rounded-2xl border border-border bg-white pr-2 pl-[10px] text-xs font-medium text-secondary">
              <LineIcon name="pin" size={14} />{feed ? feed.region?.sigungu ?? '지역 선택' : '　　'}<LineIcon name="down" size={14} />
            </button>
            <span className="text-xs text-muted">관심사에 맞춰 찾은 뉴스</span>
          </div>
          <h1 className="text-2xl leading-8 font-bold">{feed?.nickname ? `${feed.nickname}님을` : '나를'} 위한 추천 뉴스</h1>
        </div>
        <div className="flex items-center gap-1">
          {!member && <button type="button" onClick={onLogin} className="cursor-pointer px-1 text-[13px] font-medium text-secondary underline">로그인</button>}
          <button type="button" aria-label={unread ? '알림, 새 알림 있음' : '알림'} onClick={onNotifications} className="relative -mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-surface">
            <LineIcon name="bell" />{unread && <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-[#f04452]" />}
          </button>
        </div>
      </div>
      {feed && !feed.profileComplete && <button type="button" onClick={onProfile} className="mt-1 cursor-pointer text-left text-xs leading-[18px] text-brand underline">나이·직종을 알려 주면 더 잘 맞는 뉴스를 찾아 드려요</button>}
      <section aria-labelledby="keywords-heading" className="mt-[26px]">
        <div className="flex items-center justify-between">
          <h2 id="keywords-heading" className="text-base font-bold">나의 매칭 키워드</h2>
          <button type="button" onClick={() => setSheet('keywords')} className="flex h-6 cursor-pointer items-center gap-0.5 text-sm font-medium text-secondary">편집<LineIcon name="next" size={16} /></button>
        </div>
        <div className="-mr-5 mt-2 flex gap-2 overflow-x-auto pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={() => setSheet('keywords')} className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-subtle bg-surface px-4 text-sm font-medium text-secondary"><LineIcon name="plus" size={16} />추가</button>
          {feed ? keywords.map(word => <span key={word} className="flex h-10 shrink-0 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-secondary">{word}</span>)
            : [0, 1, 2].map(index => <Skeleton key={index} className="h-10 w-20 shrink-0 rounded-full" />)}
        </div>
      </section>
      {body}
    </Screen>
    {sheet === 'keywords' && feed && <KeywordSheet initial={initialDraft} onClose={() => setSheet(undefined)}
      onSaved={() => { setSheet(undefined); reload(); setToast({ title: '매칭 키워드를 바꿨어요.', body: '새로 찾은 기사를 보여 드려요.' }) }} />}
    {sheet === 'region' && <RegionSheet open initial={feed?.region} pending={regionSaving} onClose={() => setSheet(undefined)} onSelect={changeRegion} />}
  </>
}
