import type { NewsApi } from '../apis/news'
import { findPreviewArticleByUrl, PREVIEW_ARTICLES } from './news'

export const previewNewsService: NewsApi = {
  async getRecommendedArticles(topicIds) {
    return PREVIEW_ARTICLES.filter((article) => topicIds.includes(article.topicId))
  },
  convertArticle(sourceUrl, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'))
        return
      }

      const cancel = () => {
        window.clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      const timer = window.setTimeout(() => {
        signal?.removeEventListener('abort', cancel)
        const article = findPreviewArticleByUrl(sourceUrl)
        if (article) resolve(article)
        else reject(new Error('ARTICLE_UNAVAILABLE'))
      }, 1800)

      signal?.addEventListener('abort', cancel, { once: true })
    })
  },
}
