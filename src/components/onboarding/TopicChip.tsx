import type { Topic } from '../../types/onboarding'
import { Icon } from '../ui/Icon'

type TopicChipProps = {
  topic: Topic
  selected?: boolean
  mode?: 'select' | 'add' | 'remove'
  onClick: () => void
}

export function TopicChip({ topic, selected = false, mode = 'select', onClick }: TopicChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={mode === 'select' ? selected : undefined}
      aria-label={mode === 'add' ? `${topic.label} 추가` : mode === 'remove' ? `${topic.label} 삭제` : topic.label}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm leading-[22px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none ${selected ? 'border-brand bg-brand-soft text-brand hover:bg-blue-100' : 'border-slate-300 bg-white text-secondary hover:bg-surface'}`}
    >
      {mode === 'add' && <Icon name="plus" />}
      {mode === 'select' && selected && <Icon name="check" />}
      {topic.label}
      {mode === 'remove' && <Icon name="remove" />}
    </button>
  )
}
