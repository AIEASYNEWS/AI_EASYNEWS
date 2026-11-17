import type { NewsItem } from '../../types/news'
import { TOPICS } from '../../constants/topics'
import { relativeTime } from '../../utils/date'

export function NewsListItem({ article, onClick }: { article: NewsItem; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-end gap-4 border-b border-line py-4 text-left first:pt-0 focus-visible:outline-2 focus-visible:-outline-offset-2">
    <div className="min-w-0 flex-1"><span className="inline-flex rounded bg-surface px-2 py-1 text-xs leading-[18px] text-secondary">{TOPICS.find(topic => topic.id === article.topicId)?.label || '뉴스'}</span><h2 className="mt-2 line-clamp-2 text-base leading-6 font-bold break-keep">{article.title}</h2><p className="mt-2 text-xs leading-[18px] text-muted">{article.publisher} · {relativeTime(article.publishedAt)}</p></div>
    <div aria-hidden="true" className="size-[72px] shrink-0 overflow-hidden rounded-lg bg-[#999999]">{article.imageUrl && <img src={article.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} className="size-full object-cover" />}</div>
  </button>
}
