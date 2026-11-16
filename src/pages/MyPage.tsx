import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../apis/firebase'
import { getHistory } from '../apis/news'
import { NewsListItem } from '../components/explore/NewsListItem'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { RequestState } from '../components/ui/RequestState'
import { useAuth } from '../hooks/useAuth'
import type { NewsItem } from '../types/news'

export function MyPage({ onHome, onExplore, onSettings, onLogin, onArticle }: { onHome: () => void; onExplore: () => void; onSettings: () => void; onLogin: () => void; onArticle: (article: NewsItem) => void }) {
  const { user } = useAuth()
  const [history, setHistory] = useState<NewsItem[]>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    getHistory().then(items => { if (active) setHistory(items) }).catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [version, user?.uid])
  return <PageLayout title="마이" header={<h1 className="text-xl leading-7 font-bold">마이</h1>} contentClassName="px-5 pt-3 pb-6" footer={<BottomNavigation active="my" onHome={onHome} onExplore={onExplore} onMyPage={() => {}} />}>
    <h2 className="text-2xl leading-8 font-bold">{user && !user.isAnonymous ? `${user.displayName || '회원'}님` : '쉬운말 뉴스와 함께해요'}</h2><p className="mt-2 text-sm text-[#777777]">{user && !user.isAnonymous ? user.email : '로그인하면 읽은 기사와 관심 주제를 이어서 볼 수 있어요.'}</p>
    {(!user || user.isAnonymous) && <Button className="mt-6" onClick={onLogin}>로그인하기</Button>}
    <Button variant="secondary" className="mt-6" onClick={onSettings}>관심 주제 설정</Button>
    <section className="mt-8"><h2 className="text-lg leading-[26px] font-bold">변환한 기사</h2><div className="mt-4">{error ? <RequestState error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /> : !history ? <RequestState loading /> : history.length ? history.map(article => <NewsListItem key={article.id} article={article} onClick={() => onArticle(article)} />) : <RequestState empty="아직 변환한 기사가 없어요." />}</div></section>
    {user && !user.isAnonymous && <Button variant="text" className="mt-6" onClick={() => { if (auth) void signOut(auth).then(onHome).catch(() => setError('로그아웃하지 못했어요. 다시 시도해 주세요.')) }}>로그아웃</Button>}
  </PageLayout>
}
