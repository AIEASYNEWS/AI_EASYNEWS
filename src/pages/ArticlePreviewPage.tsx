import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { TOPICS } from '../constants/topics'
import type { NewsArticle } from '../types/news'
import { formatDate } from '../utils/date'
import { readableArticleParagraphs } from '../utils/articleText'

interface ArticlePreviewPageProps {
  relatedTitle?: string
  article: NewsArticle
  onBack: () => void
  onConvert: () => void
  onOriginal: () => void
}

export function ArticlePreviewPage({ relatedTitle, article, onBack, onConvert, onOriginal }: ArticlePreviewPageProps) {
  const paragraphs = readableArticleParagraphs(article.originalParagraphs.length ? article.originalParagraphs : [article.excerpt], 700)
  return (
    <PageLayout title="기사 미리보기" onBack={onBack} contentClassName="px-5 pt-1 pb-6" footer={<div className="flex flex-col gap-2 px-5 py-4"><Button onClick={onConvert}>쉬운말로 변환하기</Button><Button variant="secondary" onClick={onOriginal}>원문 보기</Button></div>}>
      <div className="flex items-center gap-2 text-xs leading-[18px] text-muted"><span className="rounded bg-surface px-2 py-1 text-secondary">{relatedTitle ? '관련 기사' : TOPICS.find((topic) => topic.id === article.topicId)?.label}</span><span>{relatedTitle ? `‘${relatedTitle}’ 기사와 관련 기사` : '뉴스 미리보기'}</span></div>
      <h1 className="mt-6 text-2xl leading-8 font-bold break-keep">{article.title}</h1>
      <p className="mt-3 text-xs leading-[18px] text-muted">{article.publisher} · {formatDate(article.publishedAt)}</p>
      <div role="img" aria-label="기사 이미지 자리" className="mt-6 aspect-video w-full overflow-hidden rounded-xl bg-[#999999]">{article.imageUrl && <img src={article.imageUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} className="size-full object-cover" />}</div>
      <div className="mt-6 border-t border-line pt-6"><h2 className="text-xs leading-[18px] text-muted">기사 앞부분 미리보기</h2><div className="mt-4 space-y-6">{paragraphs.map((paragraph, index) => <p key={index} className="text-lg leading-8 break-keep text-pretty [overflow-wrap:anywhere]">{paragraph}</p>)}</div></div>
    </PageLayout>
  )
}
