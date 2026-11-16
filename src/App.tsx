import { useCallback, useEffect, useState } from 'react'
import { getQuota } from './apis/news'
import { auth, usingEmulators } from './apis/firebase'
import { ConversionLimitDialog } from './components/home/ConversionLimitDialog'
import { NotificationsDialog } from './components/home/NotificationsDialog'
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
  const viewer = user && !user.isAnonymous ? 'member' : 'guest'
  const [sourceUrl, setSourceUrl] = useState('')
  const [cached, setCached] = useState<{ uid?: string; article: NewsArticle }>()
  const [failed, setFailed] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [quota, setQuota] = useState<{ uid?: string; remaining: number }>()
  const [quotaVersion, setQuotaVersion] = useState(0)
  useEffect(() => {
    if (loading) return
    let active = true
    getQuota().then(value => { if (active) setQuota({ uid: user?.uid, remaining: value.remaining }) }).catch(() => {})
    return () => { active = false }
  }, [user?.uid, loading, quotaVersion])
  const remaining = quota?.uid === user?.uid ? quota?.remaining ?? null : null
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
    setFailed(true); setNotice(error.message); setQuotaVersion(value => value + 1)
    replaceHash('/home')
  }, [])
  function previewArticle(article: NewsItem) { navigate('preview', { sourceUrl: article.sourceUrl }) }
  const myPage = () => navigate('my')
  const notifications = () => { if (viewer === 'guest') navigate('login'); else setNotificationsOpen(true) }

  let content
  if (route.page === 'welcome') content = <OnboardingPage onLogin={() => navigate('login')} onSignUp={() => navigate('signup')} onContinueAsGuest={() => navigate('home')} />
  else if (route.page === 'login' || route.page === 'signup') content = <AuthPage key={route.page} signup={route.page === 'signup'} onBack={() => navigate('welcome')} onSwitch={() => navigate(route.page === 'login' ? 'signup' : 'login')} onSuccess={() => navigate(route.page === 'signup' ? 'topics' : 'home')} />
  else if (route.page === 'topics') content = <InterestTopicsPage onComplete={() => navigate('home')} />
  else if (route.page === 'interests') content = <InterestSettingsPage onBack={() => navigate('my')} />
  else if (route.page === 'converting' && (route.sourceUrl || sourceUrl)) content = <ConversionPage sourceUrl={route.sourceUrl || sourceUrl} onSuccess={conversionComplete} onFailure={conversionFailed} onCancel={() => { navigate('home'); setQuotaVersion(value => value + 1) }} />
  else if (route.page === 'preview' || route.page === 'article') content = <ArticleRoutePage key={`${route.page}:${route.articleId}:${route.sourceUrl}:${route.original}:${user?.uid}`} id={route.articleId} sourceUrl={route.sourceUrl} initial={initial} preview={route.page === 'preview'} original={route.original} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate('home') }} onConvert={startConversion} onOriginal={url => navigate('article', { sourceUrl: url, original: true })} onRelated={report => { if (report.sourceUrl) navigate('preview', { sourceUrl: report.sourceUrl }) }} />
  else if (route.page === 'explore') content = <ExplorePage onHome={() => navigate('home')} onMyPage={myPage} onNotifications={notifications} onArticle={previewArticle} />
  else if (route.page === 'my') content = <MyPage key={user?.uid} onHome={() => navigate('home')} onExplore={() => navigate('explore')} onSettings={() => navigate('interests')} onLogin={() => navigate('login')} onArticle={article => navigate('article', { articleId: article.id })} />
  else content = <HomePage key={`${user?.uid}:${quotaVersion}`} viewer={viewer} sourceUrl={sourceUrl} onUrlChange={url => { setSourceUrl(url); setFailed(false) }} remaining={remaining} failed={failed} onConvert={startConversion} onLogin={() => navigate('welcome')} onSettings={() => navigate('interests')} onExplore={() => navigate('explore')} onMyPage={myPage} onNotifications={notifications} onArticle={previewArticle} />

  return <>{usingEmulators && <div className="fixed top-0 left-0 z-40 bg-[#f5f5f5] px-2 py-1 text-[10px] text-[#777777]">Firebase 로컬 테스트</div>}{content}{notificationsOpen && <NotificationsDialog onClose={() => setNotificationsOpen(false)} onArticle={previewArticle} />}<ConversionLimitDialog open={limitOpen} viewer={viewer} onClose={() => setLimitOpen(false)} onLogin={() => { setLimitOpen(false); navigate('login') }} onSignUp={() => { setLimitOpen(false); navigate('signup') }} /><Dialog open={Boolean(notice)} labelledBy="app-notice" onClose={() => setNotice('')}><h2 id="app-notice" className="text-center text-lg leading-[26px] font-bold">{notice}</h2><Button className="mt-6" onClick={() => setNotice('')}>확인</Button></Dialog></>
}
