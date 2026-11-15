import type { NewsArticle } from '../types/news'
import type { TopicId } from '../types/onboarding'

/** 서버 명세 확정 후 구현할 계약. 현재 UI는 mocks의 예시 데이터만 사용한다. */
export interface NewsApi {
  getRecommendedArticles(topicIds: TopicId[], signal?: AbortSignal): Promise<NewsArticle[]>
  convertArticle(sourceUrl: string, signal?: AbortSignal): Promise<NewsArticle>
}
