import { useAccountResource } from '../hooks/useAccountResource'
import { getNotifications } from '../apis/account'
import { ArticleUrlForm } from '../components/home/ArticleUrlForm'
import { NewsCard } from '../components/home/NewsCard'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { TOPICS } from '../constants/topics'
import { useRecommendedNews } from '../hooks/useRecommendedNews'
import { RequestState } from '../components/ui/RequestState'
import { NewsSkeleton } from '../components/ui/NewsSkeleton'
import type { NewsItem, ViewerMode } from '../types/news'
import { useInterestTopics } from '../hooks/useInterestTopics'

interface HomePageProps {
  viewer: ViewerMode
  sourceUrl: string
  onUrlChange: (url: string) => void
  quotaText: string
  failed: boolean
  onConvert: (url: string) => void
  onSettings: () => void
  onExplore: () => void
  onMyPage: () => void
  onNotifications: () => void
  onArticle: (article: NewsItem) => void
}

export function HomePage({ viewer, sourceUrl, onUrlChange, quotaText, failed, onConvert, onSettings, onExplore, onMyPage, onNotifications, onArticle }: HomePageProps) {
  const { preferences } = useInterestTopics()
  const notifications = useAccountResource(getNotifications)
  const unread = notifications.value?.some(item => !item.read)
  const topics = TOPICS.filter((topic) => preferences.topicIds.includes(topic.id))
  const { data, loading, error, retry } = useRecommendedNews(true, preferences.topicIds.join(','))
  const articles = data?.items ?? []
  const sourceDescription = data?.source === 'catalog' ? '저장된 뉴스에서 고른 기사' : undefined

  return (
    <>
      <PageLayout
        title="홈"
        header={<><img src="/images/home/aleum-logo.svg" alt="aleum" width="96" height="32" className="h-8 w-24 object-contain" /><button type="button" aria-label="알림" onClick={onNotifications} className="relative -mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"><Icon name={unread ? 'notification' : 'bell'} /></button></>}
        contentClassName="px-5 pt-3 pb-6"
        footer={<BottomNavigation onHome={() => document.querySelector('main')?.scrollTo({ top: 0 })} onExplore={onExplore} onMyPage={onMyPage} />}
      >
        <h1 className="text-2xl leading-8 font-bold break-keep">어려운 뉴스, 쉬운 말로</h1>
        <p className="mt-2 text-sm leading-[21px] text-muted">기사 주소만 붙여 넣으면 AI가 쉬운 말로 바꿔 드려요.</p>
        <div className="mt-4"><ArticleUrlForm value={sourceUrl} onChange={onUrlChange} onSubmit={onConvert} quotaText={quotaText} unlimited={viewer === 'subscriber'} failed={failed} /></div>
        <section aria-labelledby="recommendations-heading" aria-description={sourceDescription} className="mt-10">
          <h2 id="recommendations-heading" title={sourceDescription} className="text-lg leading-[26px] font-bold">관심 주제 뉴스</h2>
          <p className="mt-2 text-xs leading-[18px] text-muted">내 관심 주제: {topics.length > 0 ? topics.map((topic) => topic.label).join(' · ') : '아직 고른 주제가 없어요'}</p>
          <div className="mt-4 flex flex-col gap-4">
            {loading && <NewsSkeleton />}
            {error && <RequestState error={error} onRetry={retry} />}
            {articles.map((article, index) => <NewsCard key={`${article.id}:${index}`} article={article} onClick={() => onArticle(article)} />)}
            {!loading && !error && articles.length === 0 && <div className="rounded-xl border border-line p-4">
              <p className="text-sm leading-[21px] text-muted">{data?.waitingForCollection
                ? '아직 수집된 기사가 없어요. 첫 기사가 들어오면 여기에 표시돼요.'
                : '아직 선택한 주제의 기사가 없어요. 새 기사가 들어오면 다시 확인할게요.'}</p>
              {topics.length > 0 || data?.waitingForCollection
                ? <Button variant="secondary" className="mt-4" onClick={retry}>다시 확인하기</Button>
                : <Button variant="secondary" className="mt-4" onClick={onSettings}>관심 주제 설정하기</Button>}
            </div>}
          </div>
        </section>
      </PageLayout>
    </>
  )
}
