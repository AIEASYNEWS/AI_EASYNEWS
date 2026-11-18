import { RelatedReportsCarousel } from '../components/article/RelatedReportsCarousel'
import { PageLayout } from '../components/layout/PageLayout'
import type { NewsArticle, RelatedReport } from '../types/news'

interface ArticleComparisonPageProps {
  article: NewsArticle
  onBack: () => void
  onRelated: (report: RelatedReport) => void
}

export function ArticleComparisonPage({ article, onBack, onRelated }: ArticleComparisonPageProps) {
  return (
    <PageLayout title="언론사 비교" onBack={onBack} contentClassName="px-5 py-6">
      <h2 className="text-lg leading-[26px] font-bold">같은 이슈, 다른 관점</h2>
      {article.reports.length > 0 && <>
        <p className="mt-2 text-sm leading-[21px] text-muted">같은 사건·쟁점을 다르게 다룬 보도 {article.reports.length}개예요. 옆으로 넘기거나 화살표를 눌러 비교해 보세요.</p>
        {article.originalFocus && <div className="mt-4 rounded-xl border border-line p-4"><p className="text-xs leading-[18px] text-muted">지금 읽은 기사의 관점</p><p className="mt-2 text-sm leading-[21px]">{article.originalFocus}</p></div>}
        <div className="mt-4 rounded-xl bg-surface p-4"><p className="text-xs leading-[18px] text-muted">관점이 다른 부분</p><p className="mt-2 text-sm leading-[21px]">{article.comparison}</p></div>
        <RelatedReportsCarousel reports={article.reports} onRelated={onRelated} />
      </>}
      {article.reports.length === 0 && <p role="status" className="mt-4 text-sm leading-[21px] text-muted">{article.comparisonNotice || '비교할 수 있는 보도를 찾지 못했어요.'}</p>}
    </PageLayout>
  )
}
