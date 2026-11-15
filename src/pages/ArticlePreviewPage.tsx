import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { TOPICS } from '../constants/topics'
import type { NewsArticle } from '../types/news'

interface ArticlePreviewPageProps {
  article: NewsArticle
  onBack: () => void
  onConvert: () => void
  onOriginal: () => void
}

export function ArticlePreviewPage({ article, onBack, onConvert, onOriginal }: ArticlePreviewPageProps) {
  return (
    <PageLayout title="기사 미리보기" onBack={onBack} contentClassName="px-5 pt-1 pb-6" footer={<div className="flex flex-col gap-2 px-5 py-4"><Button onClick={onConvert}>쉬운말로 변환하기</Button><Button variant="secondary" onClick={onOriginal}>원문 보기</Button></div>}>
      <div className="flex items-center gap-2 text-xs leading-[18px] text-[#777777]"><span className="rounded bg-[#f5f5f5] px-2 py-1 text-[#333333]">{TOPICS.find((topic) => topic.id === article.topicId)?.label}</span><span>관심 주제 맞춤 추천</span></div>
      <h1 className="mt-6 text-2xl leading-8 font-bold break-keep">{article.title}</h1>
      <p className="mt-3 text-xs leading-[18px] text-[#777777]">{article.publisher} · {article.publishedAt}</p>
      <div role="img" aria-label="기사 이미지 자리" className="mt-6 aspect-video w-full rounded-xl bg-[#999999]" />
      <div className="mt-6 border-t border-[#e5e5e5] pt-6"><h2 className="text-xs leading-[18px] text-[#777777]">기사 앞부분 미리보기</h2><p className="mt-3 text-lg leading-7 break-keep">{article.excerpt}</p></div>
    </PageLayout>
  )
}
