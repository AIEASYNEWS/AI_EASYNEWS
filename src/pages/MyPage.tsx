import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../apis/firebase'
import { detachDevice } from '../apis/push'
import { getNotificationSettings } from '../apis/account'
import { getHistory } from '../apis/news'
import { useAccountResource } from '../hooks/useAccountResource'
import { NewsListItem } from '../components/explore/NewsListItem'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { PageLayout } from '../components/layout/PageLayout'
import { SettingsRow, TopicBadges } from '../components/layout/SettingsRow'
import { Button } from '../components/ui/Button'
import { RequestState } from '../components/ui/RequestState'
import { useAuth } from '../hooks/useAuth'
import type { NewsItem, ViewerMode } from '../types/news'

interface Props {
  viewer: ViewerMode; quotaText: string; onHome: () => void; onExplore: () => void; onSettings: () => void
  onLogin: () => void; onAlerts: () => void; onPlan: () => void; onArticle: (article: NewsItem) => void
}
export function MyPage({ viewer, quotaText, onHome, onExplore, onSettings, onLogin, onAlerts, onPlan, onArticle }: Props) {
  const { user } = useAuth()
  const guest = viewer === 'guest'
  const paid = viewer === 'subscriber'
  const settings = useAccountResource(getNotificationSettings)
  const history = useAccountResource(getHistory, !!user)
  const [error, setError] = useState('')
  async function logout() {
    try { await detachDevice(); if (auth) await signOut(auth); onHome() }
    catch { setError('로그아웃하지 못했어요. 다시 시도해 주세요.') }
  }
  return <PageLayout title="마이페이지" header={<h1 className="text-xl font-bold">마이페이지</h1>} contentClassName="px-5 pt-2 pb-6" footer={<BottomNavigation active="my" onHome={onHome} onExplore={onExplore} onMyPage={() => document.querySelector('main')?.scrollTo(0, 0)} />}>
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3"><img src={guest ? '/images/ui/guest-avatar.svg' : '/images/ui/account-avatar.svg'} alt="" width="40" height="40" />
        <h2 className="text-lg font-bold">{guest ? '게스트' : (user?.displayName || user?.email?.split('@')[0] || '회원') + ' 님'}</h2>
        <span className={`rounded px-2 py-1 text-xs font-bold ${guest ? 'bg-slate-200 text-muted' : 'bg-brand-soft text-brand'}`}>{guest ? '비회원' : paid ? '구독 회원' : '회원'}</span></div>
      <p className="mt-4 text-[13px] text-muted">변환 횟수 <strong className="ml-1 text-ink">{quotaText}</strong></p>
    </section>
    {guest ? <section className="mt-6 rounded-2xl border border-dashed border-line px-4 py-6 text-center"><img src="/images/ui/guest-lock.svg" alt="" className="mx-auto mb-4" /><h2 className="font-bold">로그인하고 더 편하게 보기</h2><p className="mt-2 text-sm text-muted">계정을 만들면 다른 기기에서도 관심 주제를 사용할 수 있어요.</p>
      <Button className="mt-4 min-h-12!" onClick={onLogin}>로그인하기</Button></section> : null}
      <section className="mt-6"><h2 className="text-lg font-bold">내 관심 주제</h2>{settings.value ? <TopicBadges ids={settings.value.topicIds} /> : <RequestState loading={!settings.error} error={settings.error} onRetry={settings.retry} />}</section>
      <div className="mt-6"><SettingsRow title="관심 주제 설정" onClick={onSettings} />
        <SettingsRow title="알림 설정" detail={settings.value ? `관심 주제 알림 ${settings.value.enabled ? '켜짐' : '꺼짐'}` : undefined} onClick={onAlerts} />
        {paid && <SettingsRow title="구독 관리" detail="결제한 곳에서 구독을 확인하고 바꿀 수 있어요." onClick={onPlan} />}
        {!guest && <button onClick={() => void logout()} className="min-h-14 w-full border-b border-line text-left">로그아웃</button>}</div>
    {(history.value?.length || history.error) ? <details className="mt-6"><summary className="cursor-pointer font-semibold">변환한 기사 {history.value?.length}</summary>
      <div className="mt-4">{history.error ? <RequestState error={history.error} onRetry={history.retry} /> : history.value?.map(article => <NewsListItem key={article.id} article={article} onClick={() => onArticle(article)} />)}</div></details> : null}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </PageLayout>
}
