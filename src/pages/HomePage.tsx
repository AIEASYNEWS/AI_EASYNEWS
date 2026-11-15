import { useState } from 'react'
import { ArticleUrlForm } from '../components/home/ArticleUrlForm'
import { NewsCard } from '../components/home/NewsCard'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { TOPICS } from '../constants/topics'
import { PREVIEW_ARTICLES } from '../mocks/news'
import type { NewsArticle, ViewerMode } from '../types/news'
import { readInterestPreferences } from '../utils/interestPreferences'

interface HomePageProps {
  viewer: ViewerMode
  sourceUrl: string
  onUrlChange: (url: string) => void
  remaining: number | null
  failed: boolean
  onConvert: (url: string) => void
  onLogin: () => void
  onSettings: () => void
  onArticle: (article: NewsArticle) => void
}

export function HomePage({ viewer, sourceUrl, onUrlChange, remaining, failed, onConvert, onLogin, onSettings, onArticle }: HomePageProps) {
  const [preferences] = useState(readInterestPreferences)
  const [notice, setNotice] = useState('')
  const guest = viewer === 'guest'
  const topics = TOPICS.filter((topic) => preferences.topicIds.includes(topic.id))
  const articles = PREVIEW_ARTICLES.filter((article) => preferences.topicIds.includes(article.topicId))

  return (
    <>
      <PageLayout
        title="홈"
        header={<><span className="text-xl leading-7 font-bold">쉬운말 뉴스</span><button type="button" aria-label="알림" onClick={() => guest ? onLogin() : setNotice('새로운 알림이 없어요.')} className="relative -mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-[#f5f5f5] focus-visible:outline-2 focus-visible:outline-offset-2"><Icon name={guest ? 'bell' : 'notification'} />{!guest && <span aria-hidden="true" className="absolute top-2 right-2 size-1.5 rounded-full border border-white bg-[#333333]" />}</button></>}
        contentClassName="px-5 pt-3 pb-6"
        footer={<BottomNavigation onHome={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })} onExplore={() => setNotice('탐색 화면은 준비 중이에요.')} onMyPage={guest ? onLogin : onSettings} />}
      >
        <h1 className="text-2xl leading-8 font-bold break-keep">어려운 뉴스, 쉬운 말로</h1>
        <p className="mt-2 text-sm leading-[21px] text-[#777777]">기사 주소만 붙여 넣으면 AI가 쉬운 말로 바꿔 드려요.</p>
        <div className="mt-4"><ArticleUrlForm value={sourceUrl} onChange={onUrlChange} onSubmit={onConvert} remaining={remaining} failed={failed} /></div>
        <section aria-labelledby="recommendations-heading" className="mt-10">
          <h2 id="recommendations-heading" className="text-lg leading-[26px] font-bold">관심 주제 맞춤 뉴스</h2>
          {guest ? (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-[#dddddd] p-4 pt-6 text-center">
              <Icon name="lock" />
              <p className="mt-4 text-sm leading-[21px] font-bold">로그인하고 맞춤 뉴스 받기</p>
              <p className="mt-2 text-sm leading-[21px] break-keep text-[#777777]">관심 주제를 고르면 나에게 맞는 뉴스를 골라 드려요.</p>
              <Button variant="secondary" className="mt-4" onClick={onLogin}>로그인하기</Button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs leading-[18px] text-[#777777]">내 관심 주제: {topics.length > 0 ? topics.map((topic) => topic.label).join(' · ') : '아직 고른 주제가 없어요'}</p>
              <div className="mt-4 flex flex-col gap-4">
                {articles.map((article) => <NewsCard key={article.id} article={article} onClick={() => onArticle(article)} />)}
                {articles.length === 0 && <div className="rounded-xl border border-[#dddddd] p-4"><p className="text-sm leading-[21px] text-[#777777]">{topics.length === 0 ? '궁금한 주제를 고르면 맞춤 뉴스를 볼 수 있어요.' : '선택한 주제의 새 기사를 기다리고 있어요.'}</p><Button variant="secondary" className="mt-4" onClick={onSettings}>관심 주제 설정하기</Button></div>}
              </div>
            </>
          )}
        </section>
      </PageLayout>
      <Dialog open={Boolean(notice)} labelledBy="home-notice" onClose={() => setNotice('')}><h2 id="home-notice" className="text-center text-lg leading-[26px] font-bold">{notice}</h2><Button className="mt-6" onClick={() => setNotice('')}>확인</Button></Dialog>
    </>
  )
}
