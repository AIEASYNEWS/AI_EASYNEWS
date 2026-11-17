import { useEffect, useState } from 'react'
import { getArticlePreview, getSavedArticle } from '../apis/news'
import { PageLayout } from '../components/layout/PageLayout'
import { RequestState } from '../components/ui/RequestState'
import { ArticlePage } from './ArticlePage'
import { ArticlePreviewPage } from './ArticlePreviewPage'
import type { NewsArticle, RelatedReport } from '../types/news'

export function ArticleRoutePage({ id, sourceUrl, relatedTitle, initial, preview, original, onBack, onConvert, onOriginal, onRelated }: { relatedTitle?: string; id?: string; sourceUrl?: string; initial?: NewsArticle; preview: boolean; original?: boolean; onBack: () => void; onConvert: (url: string) => void; onOriginal: (url: string) => void; onRelated: (report: RelatedReport, title: string) => void }) {
  const [article, setArticle] = useState(initial)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (initial) return
    const controller = new AbortController()
    const request = sourceUrl ? getArticlePreview(sourceUrl, controller.signal) : id ? getSavedArticle(id, controller.signal) : Promise.reject(new Error('기사 주소를 확인해 주세요.'))
    request.then(value => { if (!controller.signal.aborted) setArticle(value) }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [id, sourceUrl, initial, version])
  if (!article) return <PageLayout title="기사 불러오기" onBack={onBack} contentClassName="px-5"><RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /></PageLayout>
  return preview ? <ArticlePreviewPage relatedTitle={relatedTitle} article={article} onBack={onBack} onConvert={() => onConvert(article.sourceUrl)} onOriginal={() => onOriginal(article.sourceUrl)} /> : <ArticlePage article={article} original={original || !article.easyParagraphs.length} onBack={onBack} onRelated={report => onRelated(report, article.easyTitle || article.title)} onConvert={() => onConvert(article.sourceUrl)} />
}
