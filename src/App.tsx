import { useCallback, useEffect, useState } from 'react'
import { getQuota } from './apis/news'
import { auth, usingEmulators } from './apis/firebase'
import { ConversionLimitDialog } from './components/home/ConversionLimitDialog'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotificationSettingsPage } from './pages/NotificationSettingsPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { SplashPage } from './pages/SplashPage'
import { Button } from './components/ui/Button'
import { Dialog } from './components/ui/Dialog'
import { useAppNavigation } from './hooks/useAppNavigation'
import { useAuth } from './hooks/useAuth'
import { ArticleRoutePage } from './pages/ArticleRoutePage'
import { AuthPage } from './pages/AuthPage'
import { ConversionPage } from './pages/ConversionPage'
import { ExplorePage } from './pages/ExplorePage'
import { HomePage } from './pages/HomePage'
import { MyPage } from './pages/MyPage'
import { InterestSettingsPage } from './pages/InterestSettingsPage'
import { InterestTopicsPage } from './pages/InterestTopicsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import type { NewsArticle, NewsItem } from './types/news'

function replaceHash(path: string) {
  window.history.replaceState(null, '', `#${path}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export default function App() {
  const { route, navigate } = useAppNavigation()
  const { user, loading } = useAuth()
  const member = Boolean(user && !user.isAnonymous)
  const [splash, setSplash] = useState(() => !window.location.hash)
  useEffect(() => {
    if (!splash || loading) return
    const timer = window.setTimeout(() => {
      if (!window.location.hash) replaceHash(user ? '/home' : '/onboarding')
      setSplash(false)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [splash, loading, user])
  const [sourceUrl, setSourceUrl] = useState('')
  const [cached, setCached] = useState<{ uid?: string; article: NewsArticle }>()
  const [failed, setFailed] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [subscribedToast, setSubscribedToast] = useState(false)
  useEffect(() => {
    if (!subscribedToast) return
    const timeout = window.setTimeout(() => setSubscribedToast(false), 5000)
    return () => window.clearTimeout(timeout)
  }, [subscribedToast])
  const [quota, setQuota] = useState<{ uid?: string; remaining: number | null; unlimited?: boolean; error?: boolean }>()
  const [quotaVersion, setQuotaVersion] = useState(0)
  useEffect(() => {
    if (loading || !window.location.hash || route.page === 'welcome' || route.page === 'signup' || route.page === 'login') return
    let active = true
    const refresh = () => getQuota().then(value => {
      if (!active) return
      setQuota({ uid: user?.uid, ...value })
      if (value.unlimited && user && sessionStorage.getItem('easynews:checkout') === user.uid) {
        sessionStorage.removeItem('easynews:checkout')
        setSubscribedToast(true)
        replaceHash('/home')
      }
    }).catch(() => { if (active) setQuota({ uid: user?.uid, remaining: null, error: true }) })
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [user, member, loading, quotaVersion, route.page, splash])
  const remaining = quota?.uid === user?.uid ? quota?.remaining ?? null : null
  const viewer = !member ? 'guest' : quota?.uid === user?.uid && quota?.unlimited ? 'subscriber' : 'member'
  const quotaText = viewer === 'subscriber' ? '무제한' : remaining !== null ? `${remaining}회` : quota?.error ? '확인할 수 없음' : '확인 중'
  const initial = cached && cached.uid === user?.uid && cached.article.id === route.articleId ? cached.article : undefined

  function startConversion(url: string) {
    if (remaining === 0) { setLimitOpen(true); return }
    setSourceUrl(url); setFailed(false)
    navigate('converting', { sourceUrl: url })
  }
  // Stable handlers prevent a rendering update from restarting an in-flight conversion.
  const conversionComplete = useCallback((article: NewsArticle) => {
    setCached({ uid: auth?.currentUser?.uid, article }); setQuotaVersion(value => value + 1)
    replaceHash(`/articles/read?id=${article.id}`)
  }, [])
  const conversionFailed = useCallback((error: Error) => {
    if ('code' in error && error.code === 'QUOTA_EXCEEDED') setLimitOpen(true)
    else { setFailed(true); setNotice(error.message) }
    setQuotaVersion(value => value + 1)
    replaceHash('/home')
  }, [])
  function previewArticle(article: NewsItem) { navigate('preview', { sourceUrl: article.sourceUrl }) }
  function openComparison(articleId: string) {
    navigate('article', { articleId, comparison: true })
  }
  function backFromArticle() {
    if (route.comparison && route.articleId && !window.history.state?.fromArticle) {
      replaceHash(`/articles/read?id=${encodeURIComponent(route.articleId)}`)
    } else if (window.history.length > 1) window.history.back()
    else navigate('home')
  }
  const myPage = () => navigate('my')
  const notifications = () => navigate('notifications', { from: route.page })
  const openPlan = () => { setLimitOpen(false); navigate('subscription', { from: route.page }) }
  if (splash || (loading && ['my', 'notifications', 'notificationSettings', 'subscription'].includes(route.page))) return <SplashPage />

  let content
  if (route.page === 'welcome') content = <OnboardingPage onLogin={() => navigate('login')} onSignUp={() => navigate('signup')} onContinueAsGuest={() => navigate('home')} />
  else if (route.page === 'login' || route.page === 'signup') content = <AuthPage key={route.page} signup={route.page === 'signup'} onBack={() => navigate(route.from ?? 'welcome')} onSwitch={() => navigate(route.page === 'login' ? 'signup' : 'login', { from: route.from })} onSuccess={() => navigate(route.page === 'signup' ? 'topics' : route.from ?? 'home')} />
  else if (route.page === 'topics') content = <InterestTopicsPage onComplete={() => navigate('home')} />
  else if (route.page === 'interests') content = <InterestSettingsPage onBack={() => navigate(route.from ?? 'my')} />
  else if (route.page === 'converting' && (route.sourceUrl || sourceUrl)) content = <ConversionPage sourceUrl={route.sourceUrl || sourceUrl} onSuccess={conversionComplete} onFailure={conversionFailed} onCancel={() => { navigate('home'); setQuotaVersion(value => value + 1) }} />
  else if (route.page === 'preview' || route.page === 'article') content = <ArticleRoutePage key={`${route.page}:${route.articleId}:${route.sourceUrl}:${route.original}:${user?.uid}`} relatedTitle={route.relatedTitle} id={route.articleId} sourceUrl={route.sourceUrl} initial={initial} preview={route.page === 'preview'} original={route.original} comparison={route.comparison} onBack={backFromArticle} onCompare={openComparison} onConvert={startConversion} onOriginal={url => navigate('article', { sourceUrl: url, original: true })} onRelated={(report, title) => { if (report.sourceUrl) navigate('preview', { sourceUrl: report.sourceUrl, relatedTitle: title }) }} />
  else if (route.page === 'notifications') content = <NotificationsPage key={user?.uid} guest={!member} onBack={() => navigate(route.from ?? 'home')} onLogin={() => navigate('login', { from: 'notifications' })} onArticle={previewArticle} />
  else if (route.page === 'notificationSettings' && member) content = <NotificationSettingsPage key={user?.uid} onBack={myPage} onTopics={() => navigate('interests', { from: 'notificationSettings' })} />
  else if (route.page === 'subscription' && member) content = <SubscriptionPage key={user?.uid} onBack={() => navigate(route.from ?? 'my')} />
  else if (route.page === 'explore') content = <ExplorePage onHome={() => navigate('home')} onMyPage={myPage} onNotifications={notifications} onArticle={previewArticle} />
  else if (['my', 'subscription', 'notificationSettings'].includes(route.page)) content = <MyPage viewer={viewer} quotaText={quotaText} onAlerts={() => navigate('notificationSettings')} onPlan={openPlan} key={user?.uid} onHome={() => navigate('home')} onExplore={() => navigate('explore')} onSettings={() => navigate('interests')} onLogin={() => navigate('login')} onArticle={article => navigate('article', { articleId: article.id })} />
  else content = <HomePage key={`${user?.uid}:${quotaVersion}`} viewer={viewer} sourceUrl={sourceUrl} onUrlChange={url => { setSourceUrl(url); setFailed(false) }} quotaText={quotaText} failed={failed} onConvert={startConversion} onLogin={() => navigate('welcome')} onSettings={() => navigate('interests')} onExplore={() => navigate('explore')} onMyPage={myPage} onNotifications={notifications} onArticle={previewArticle} />

  return <>{usingEmulators && <div className="fixed top-0 left-0 z-40 bg-surface px-2 py-1 text-[10px] text-muted">Firebase 로컬 테스트</div>}{content}{subscribedToast && <div role="status" className="fixed inset-x-5 top-14 z-50 mx-auto flex max-w-[350px] items-center gap-3 rounded-xl bg-[#293341] p-4 text-sm text-white shadow-md"><span aria-hidden="true">✓</span><div><strong>구독을 시작했어요</strong><p className="mt-1 text-slate-200">이제 횟수 제한 없이 변환할 수 있어요.</p></div></div>}<ConversionLimitDialog onSubscribe={openPlan} open={limitOpen} viewer={viewer} onClose={() => setLimitOpen(false)} onLogin={() => { setLimitOpen(false); navigate('login') }} onSignUp={() => { setLimitOpen(false); navigate('signup') }} /><Dialog open={Boolean(notice)} labelledBy="app-notice" onClose={() => setNotice('')}><h2 id="app-notice" className="text-center text-lg leading-[26px] font-bold">{notice}</h2><Button className="mt-6" onClick={() => setNotice('')}>확인</Button></Dialog></>
}
