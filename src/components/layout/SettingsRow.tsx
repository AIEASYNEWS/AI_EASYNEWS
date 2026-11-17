import { TOPICS } from '../../constants/topics'
import type { TopicId } from '../../types/onboarding'

export function TopicBadges({ ids }: { ids: TopicId[] }) {
  return <div className="mt-4 flex flex-wrap gap-2">{ids.length ? TOPICS.filter(topic => ids.includes(topic.id)).map(topic =>
    <span key={topic.id} className="rounded bg-surface px-2 py-1 text-xs text-secondary">{topic.label}</span>
  ) : <p className="text-sm text-muted">선택한 관심 주제가 없어요.</p>}</div>
}

export function SettingsRow({ title, detail, onClick }: { title: string; detail?: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-line py-4 text-left hover:bg-surface">
    <span><span className="block font-medium">{title}</span>{detail && <span className="mt-2 block text-sm text-muted">{detail}</span>}</span>
    <img src="/images/ui/next.svg" width="24" height="24" alt="" />
  </button>
}
