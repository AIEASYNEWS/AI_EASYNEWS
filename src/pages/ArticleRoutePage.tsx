import { useEffect, useState } from 'react'
import { getArticleComparison, getArticlePreview, getSavedArticle } from '../apis/news'
import { PageLayout } from '../components/layout/PageLayout'
import { RequestState } from '../components/ui/RequestState'
import { ArticlePage } from './ArticlePage'
import { ArticlePreviewPage } from './ArticlePreviewPage'
import type { NewsArticle, RelatedReport } from '../types/news'

export function ArticleRoutePage({ id, sourceUrl, relatedTitle, initial, preview, original, onBack, onConvert, onOriginal, onRelated }: { relatedTitle?: string; id?: string; sourceUrl?: string; initial?: NewsArticle; preview: boolean; original?: boolean; onBack: () => void; onConvert: (url: string) => void; onOriginal: (url: string) => void; onRelated: (report: RelatedReport, title: string) => void }) {
  const [article, setArticle] = useState(initial)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [comparisonError, setComparisonError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const pendingId = !preview && article?.comparisonStatus === 'pending' ? article.id : undefined
  const revision = article?.comparisonPlan?.revision
  useEffect(() => {
    if (!pendingId) return
    const controller = new AbortController()
    getArticleComparison(pendingId, controller.signal)
      .then(value => { if (!controller.signal.aborted) setArticle(value) })
      .catch(cause => { if (!controller.signal.aborted) setComparisonError(cause.message) })
    return () => controller.abort()
  }, [pendingId, revision, attempt])
  useEffect(() => {
    if (initial) return
    const controller = new AbortController()
    const request = sourceUrl ? getArticlePreview(sourceUrl, controller.signal) : id ? getSavedArticle(id, controller.signal) : Promise.reject(new Error('기사 주소를 확인해 주세요.'))
    request.then(value => { if (!controller.signal.aborted) setArticle(value) }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [id, sourceUrl, initial, version])
  if (!article) return <PageLayout title="기사 불러오기" onBack={onBack} contentClassName="px-5"><RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} />{error && sourceUrl && /^https?:\/\//i.test(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm text-brand underline">언론사 원문 열기</a>}</PageLayout>
  if (preview) return <ArticlePreviewPage relatedTitle={relatedTitle} article={article} onBack={onBack} onConvert={() => onConvert(article.sourceUrl)} onOriginal={() => onOriginal(article.sourceUrl)} />
  return <ArticlePage comparisonError={comparisonError} retryComparison={() => { setComparisonError(''); setAttempt(value => value + 1) }} article={article} original={original || !article.easyParagraphs.length} onBack={onBack} onRelated={report => onRelated(report, article.easyTitle || article.title)} onConvert={() => onConvert(article.sourceUrl)} />
}
