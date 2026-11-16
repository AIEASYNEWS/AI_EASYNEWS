import { TOPICS } from '../../constants/topics'
import type { NewsItem } from '../../types/news'
import { relativeTime } from '../../utils/date'

export function NewsCard({ article, onClick }: { article: NewsItem; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full cursor-pointer rounded-xl border border-[#dddddd] bg-white p-4 text-left hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2">
      <span className="inline-flex rounded bg-[#f5f5f5] px-2 py-1 text-xs leading-[18px] text-[#333333]">{TOPICS.find((topic) => topic.id === article.topicId)?.label}</span>
      <h3 className="mt-2 line-clamp-2 text-base leading-6 font-bold break-keep">{article.title}</h3>
      <p className="mt-2 text-xs leading-[18px] text-[#777777]">{article.publisher} · {article.relativeTime || relativeTime(article.publishedAt)}</p>
    </button>
  )
}
