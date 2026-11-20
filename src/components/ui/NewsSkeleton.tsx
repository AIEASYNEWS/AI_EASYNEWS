export function NewsSkeleton({ comparison = false }: { comparison?: boolean }) {
  return <div role="status" className="space-y-3">
    <p className="text-sm leading-5 text-muted">
      {comparison ? '다른 언론사의 기사를 읽고 관점 차이를 비교하고 있어요.' : '뉴스를 불러오고 있어요.'}
    </p>
    {Array.from({ length: comparison ? 1 : 2 }, (_, index) =>
      <div key={index} aria-hidden="true" className="space-y-4 rounded-xl border border-line bg-white p-5">
        <div className="space-y-3 motion-safe:animate-pulse">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className={`h-4 w-5/6 rounded ${comparison ? 'bg-brand-soft' : 'bg-slate-200'}`} />
          {comparison && <div className="h-4 w-3/5 rounded bg-brand-soft" />}
          <div className="space-y-2 pt-1">
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-2/3 rounded bg-surface" />
          </div>
        </div>
      </div>)}
  </div>
}
