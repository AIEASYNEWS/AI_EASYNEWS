import { Button } from './Button'

export function RequestState({ loading, error, onRetry, empty }: { loading?: boolean; error?: string; onRetry?: () => void; empty?: string }) {
  return <div className="py-8 text-center text-sm leading-[21px] text-muted" role={error ? 'alert' : 'status'}>
    <p>{loading ? '뉴스를 불러오고 있어요.' : error || empty}</p>
    {error && onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>다시 시도</Button>}
  </div>
}
