import { useCallback, useEffect, useState } from 'react'
import { getProfile } from './apis/profile'
import { usingEmulators } from './apis/firebase'
import { ConversionLimitDialog } from './components/home/ConversionLimitDialog'
import { Screen } from './components/v2/Screen'
import { RequestState } from './components/ui/RequestState'
import { useAppNavigation } from './hooks/useAppNavigation'
import { useAuth } from './hooks/useAuth'
import { LoginPage, ProfileEditPage, SignupPage } from './pages/AccountPages'
import { ArticlePage } from './pages/ArticlePage'
import { ChatHistoryPage, ChatPage } from './pages/ChatPages'
import { HomePage } from './pages/HomePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { emptyDraft, type ProfileDraft } from './utils/profileDraft'
import { SplashPage } from './pages/SplashPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { ExplorePage } from './pages/ExplorePage'
import { MyPage } from './pages/MyPage'
import { MatchesPage } from './pages/MatchesPage'
import { NotificationsPage } from './pages/NotificationsPage'

/** Loads the saved profile before showing an edit screen (A1-1 내 정보 / A1-2 관심 분야 수정). */
function ProfileEditRoute({ kind, onBack, onSaved }: { kind: 'info' | 'interests'; onBack: () => void; onSaved: () => void }) {
  const [initial, setInitial] = useState<ProfileDraft>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getProfile(controller.signal).then(profile => {
      if (controller.signal.aborted) return
      setInitial({ ...emptyDraft, ...profile, occupationOther: profile.occupationOther ?? '', privacyConsent: Boolean(profile.privacyConsent), nickname: profile.nickname ?? '', customKeywords: profile.customKeywords ?? [] })
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])
  if (!initial) return <Screen pageTitle="내 정보" onBack={onBack}><RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /></Screen>
  return <ProfileEditPage kind={kind} initial={initial} onBack={onBack} onSaved={onSaved} />
}

export default function App() {
  const { route, navigate, replace } = useAppNavigation()
  const { user, loading } = useAuth()
  const member = Boolean(user && !user.isAnonymous)
  const [splash, setSplash] = useState(() => !window.location.hash)
  const [limitOpen, setLimitOpen] = useState(false)
  const [quote, setQuote] = useState<{ id: string; text: string }>()
  useEffect(() => {
    if (!splash || loading) return
    const timer = window.setTimeout(() => {
      if (!window.location.hash) replace(user ? 'home' : 'welcome')
      setSplash(false)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [splash, loading, user, replace])

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else replace('home')
  }, [replace])
  const openQuotaDialog = useCallback(() => setLimitOpen(true), [])
  const clearQuote = useCallback(() => setQuote(undefined), [])

  if (splash || (loading && route.page !== 'welcome')) return <SplashPage />

  let content
  const id = route.articleId
  if (route.page === 'welcome') content = <OnboardingPage onLogin={() => navigate('login')} onSignUp={() => navigate('signup')} onContinueAsGuest={() => replace('home')} />
  else if (route.page === 'login') content = <LoginPage onBack={back} onSignUp={() => replace('signup')} onSuccess={() => replace('home')} />
  else if (route.page === 'signup') content = <SignupPage onLogin={() => replace('login')} onDone={() => replace('home')} />
  else if (route.page === 'profile' || route.page === 'interests') content = <ProfileEditRoute key={`${route.page}:${user?.uid}`} kind={route.page === 'profile' ? 'info' : 'interests'} onBack={back} onSaved={back} />
  else if (route.page === 'article' && id) content = <ArticlePage key={`${id}:${user?.uid}`} id={id} tab={route.tab ?? 'original'} onBack={back}
    onTab={tab => replace('article', { articleId: id, tab })} onQuotaExceeded={openQuotaDialog}
    onChat={text => { if (text) setQuote({ id, text }); navigate('chat', { articleId: id }) }} />
  else if (route.page === 'chat' && id) content = <ChatPage key={`${id}:${user?.uid}`} id={id} quote={quote?.id === id ? quote.text : undefined} onQuoteUsed={clearQuote}
    onBack={back} onHistory={() => navigate('chats')} onArticle={() => navigate('article', { articleId: id })} />
  else if (route.page === 'chats') content = <ChatHistoryPage key={user?.uid} onBack={back} onOpen={roomId => navigate('chat', { articleId: roomId })} />
  else if (route.page === 'subscription' && member) content = <SubscriptionPage key={user?.uid} onBack={back} onActivated={() => replace('home')} />
  else if (route.page === 'matches') content = <MatchesPage onBack={back} onArticle={articleId => navigate('article', { articleId })} onChats={() => navigate('chats')} />
  else if (route.page === 'notifications') content = <NotificationsPage key={user?.uid} onBack={back} onArticle={item => navigate('article', { articleId: item.newsKey ?? item.id })} />
  else if (route.page === 'explore') content = <ExplorePage onHome={() => replace('home')} onMyPage={() => replace('my')} onArticle={article => navigate('article', { articleId: article.newsKey ?? article.id })} />
  else if (route.page === 'my') content = <MyPage key={user?.uid} viewer={member ? 'member' : 'guest'} quotaText="무제한" onHome={() => replace('home')} onExplore={() => replace('explore')}
    onSettings={() => navigate('interests')} onLogin={() => navigate('login')} onPlan={() => navigate('subscription')} onArticle={article => navigate('article', { articleId: article.newsKey ?? article.id })} />
  else content = <HomePage key={user?.uid} member={member} onArticle={articleId => navigate('article', { articleId })}
    onMore={() => navigate('matches')} onNotifications={() => navigate('notifications')}
    onProfile={() => navigate(member ? 'profile' : 'signup')} onChats={() => navigate('chats')} onLogin={() => navigate('login')}
    onExplore={() => replace('explore')} onMyPage={() => replace('my')} />

  return <>
    {usingEmulators && <div className="fixed top-0 left-0 z-40 bg-surface px-2 py-1 text-[10px] text-muted">Firebase 로컬 테스트</div>}
    {content}
    <ConversionLimitDialog open={limitOpen} viewer={member ? 'member' : 'guest'} onClose={() => setLimitOpen(false)}
      onSubscribe={() => { setLimitOpen(false); navigate('subscription') }}
      onLogin={() => { setLimitOpen(false); navigate('login') }} onSignUp={() => { setLimitOpen(false); navigate('signup') }} />
  </>
}
