import { useState } from 'react'
import { getNotifications, markRead, type NewsNotification } from '../apis/account'
import { useAccountResource } from '../hooks/useAccountResource'
import { TOPICS } from '../constants/topics'
import { relativeTime } from '../utils/date'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { RequestState } from '../components/ui/RequestState'

const calendar = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' })
function groupName(date: string) {
  const time = Date.parse(date)
  if (!Number.isFinite(time)) return '이전 알림'
  const day = calendar.format(time)
  if (day === calendar.format(Date.now())) return '오늘'
  return day === calendar.format(Date.now() - 86400000) ? '어제' : day
}

export function NotificationsPage({ guest, onLogin, onBack, onArticle }: { guest: boolean; onLogin: () => void; onBack: () => void; onArticle: (item: NewsNotification) => void }) {
  const { value, error, retry } = useAccountResource(getNotifications, !guest)
  const [readError, setReadError] = useState('')
  const byDay = new Map<string, NewsNotification[]>()
  for (const item of value || []) {
    const day = groupName(item.publishedAt)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(item)
  }
  const groups = Array.from(byDay)
  async function open(item: NewsNotification) {
    try { if (!item.read) await markRead(item.id); onArticle(item) }
    catch (cause) { setReadError((cause as Error).message) }
  }
  return <PageLayout title="알림" onBack={onBack} contentClassName="flex flex-col px-5 pb-6">
    {guest || value?.length === 0 ? <div className={guest ? 'mt-2 rounded-xl border border-dashed border-line px-4 py-6 text-center' : 'm-auto w-full text-center'}><img className="mx-auto mb-4" src={guest ? '/images/ui/guest-lock.svg' : '/images/ui/alert-empty.svg'} alt="" />
      <h2 className="font-bold">{guest ? '로그인하고 알림 받기' : '아직 받은 알림이 없어요'}</h2>
      <p className="mt-2 text-sm text-muted">{guest ? '관심 주제의 새 기사가 나오면 알림으로 알려 드려요.' : '관심 주제의 새 기사가 나오면 여기에서 알려 드려요.'}</p>
      {guest && <Button variant="secondary" className="mt-4" onClick={onLogin}>로그인하기</Button>}</div>
    : !value ? <RequestState loading={!error} error={error} onRetry={retry} /> : groups.map(([day, items]) =>
      <section key={day} className="mt-4"><h2 className="text-sm font-medium text-muted">{day}</h2>{items?.map(item =>
        <button key={item.id} type="button" onClick={() => void open(item)} className="relative block w-full border-b border-line py-4 pl-4 text-left">
          {!item.read && <span aria-label="읽지 않음" className="absolute top-6 left-0 size-2 rounded-full bg-brand" />}
          <span className="rounded bg-surface px-2 py-1 text-xs">{TOPICS.find(t => t.id === item.topicId)?.label}</span>
          <span className={`mt-2 block ${item.read ? 'text-muted' : 'font-bold'}`}>{item.title}</span>
          <span className="mt-2 block text-xs text-muted">{item.publisher} · {relativeTime(item.publishedAt)}</span>
        </button>)}</section>)}
    {readError && <p role="alert" className="mt-4 text-sm text-red-700">{readError}</p>}
  </PageLayout>
}
