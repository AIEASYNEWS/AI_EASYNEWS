import { useState } from 'react'
import { ConversionLimitDialog } from './components/home/ConversionLimitDialog'
import { Button } from './components/ui/Button'
import { Dialog } from './components/ui/Dialog'
import { useAppNavigation } from './hooks/useAppNavigation'
import { useConversionAllowance } from './hooks/useConversionAllowance'
import { findPreviewArticle } from './mocks/news'
import { ArticlePage } from './pages/ArticlePage'
import { ArticlePreviewPage } from './pages/ArticlePreviewPage'
import { ConversionPage } from './pages/ConversionPage'
import { HomePage } from './pages/HomePage'
import { InterestSettingsPage } from './pages/InterestSettingsPage'
import { InterestTopicsPage } from './pages/InterestTopicsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import type { NewsArticle, ViewerMode } from './types/news'

function readPreviewViewer(): ViewerMode {
  try {
    const value = sessionStorage.getItem('easynews.preview-viewer.v1')
    if (value === 'member' || value === 'subscriber') return value
  } catch { /* 기본 비회원 화면을 제공한다. */ }
  return 'guest'
}

export default function App() {
  const { route, navigate } = useAppNavigation()
  const [previewViewer, setPreviewViewer] = useState(readPreviewViewer)
  const viewer = route.viewer ?? previewViewer
  const [sourceUrl, setSourceUrl] = useState('')
  const [failed, setFailed] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const { remaining, recordConversion } = useConversionAllowance(viewer)
  const article = findPreviewArticle(route.articleId)

  function choosePreviewViewer(value: ViewerMode) {
    setPreviewViewer(value)
    try { sessionStorage.setItem('easynews.preview-viewer.v1', value) } catch { /* 현재 화면 상태로 유지한다. */ }
  }

  function startConversion(url: string) {
    if (remaining === 0) { setLimitOpen(true); return }
    setSourceUrl(url)
    setFailed(false)
    navigate('converting')
  }

  function conversionComplete(result: NewsArticle) {
    recordConversion()
    navigate('article', { articleId: result.id })
  }

  function conversionFailed() { setFailed(true); navigate('home') }
  function openWelcome() { setLimitOpen(false); navigate('welcome') }
  function previewSignIn() { choosePreviewViewer('member'); navigate('topics', { viewer: 'member' }) }

  let content
  if (route.page === 'welcome') {
    content = <OnboardingPage onLogin={previewSignIn} onSignUp={previewSignIn} onContinueAsGuest={() => { choosePreviewViewer('guest'); navigate('home', { viewer: 'guest' }) }} />
  } else if (route.page === 'topics') {
    content = <InterestTopicsPage onComplete={() => navigate('home')} />
  } else if (route.page === 'interests') {
    content = <InterestSettingsPage onBack={() => navigate('home')} />
  } else if (route.page === 'converting' && sourceUrl) {
    content = <ConversionPage sourceUrl={sourceUrl} onSuccess={conversionComplete} onFailure={conversionFailed} onCancel={() => navigate('home')} />
  } else if (route.page === 'preview' && article) {
    content = <ArticlePreviewPage article={article} onBack={() => navigate('home')} onConvert={() => startConversion(article.sourceUrl)} onOriginal={() => navigate('article', { articleId: article.id, original: true })} />
  } else if (route.page === 'article' && article) {
    content = <ArticlePage key={`${article.id}-${route.original}`} article={article} original={route.original} onBack={() => navigate('home')} onRelated={(report) => navigate('preview', { articleId: report.id })} />
  } else {
    content = <HomePage viewer={viewer} sourceUrl={sourceUrl} onUrlChange={(url) => { setSourceUrl(url); setFailed(false) }} remaining={remaining} failed={failed} onConvert={startConversion} onLogin={openWelcome} onSettings={() => navigate('interests')} onArticle={(item) => navigate('preview', { articleId: item.id })} />
  }

  return <>{content}<ConversionLimitDialog open={limitOpen} viewer={viewer} onClose={() => setLimitOpen(false)} onLogin={openWelcome} onSignUp={openWelcome} onSubscribe={() => { setLimitOpen(false); setNotice('구독 안내는 준비 중이에요.') }} /><Dialog open={Boolean(notice)} labelledBy="app-notice" onClose={() => setNotice('')}><h2 id="app-notice" className="text-center text-lg leading-[26px] font-bold">{notice}</h2><Button className="mt-6" onClick={() => setNotice('')}>확인</Button></Dialog></>
}
