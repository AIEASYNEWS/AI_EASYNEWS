import { useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RelatedReport } from '../../types/news'
import { formatDate } from '../../utils/date'

interface RelatedReportsCarouselProps {
  reports: RelatedReport[]
  onRelated: (report: RelatedReport) => void
}

export function RelatedReportsCarousel({ reports, onRelated }: RelatedReportsCarouselProps) {
  const id = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: number; x: number; y: number; left: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const current = Math.min(active, Math.max(0, reports.length - 1))

  function positions() {
    const viewport = viewportRef.current
    if (!viewport) return []
    const cards = Array.from(viewport.children) as HTMLElement[]
    const first = cards[0]?.offsetLeft || 0
    const max = viewport.scrollWidth - viewport.clientWidth
    return cards.map(card => Math.max(0, Math.min(max, card.offsetLeft - first)))
  }

  function nearest() {
    const left = viewportRef.current?.scrollLeft || 0
    return positions().reduce((best, position, index, all) => Math.abs(position - left) < Math.abs(all[best] - left) ? index : best, 0)
  }

  function goTo(index: number) {
    const target = Math.max(0, Math.min(reports.length - 1, index))
    const left = positions()[target]
    if (left === undefined) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewportRef.current?.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    suppressClickRef.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, moved: false }
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.id) return
    if (event.buttons === 0) { finishDrag(event, true); return }
    const distance = event.clientX - drag.x
    if (!drag.moved) {
      if (Math.abs(distance) < 6 || Math.abs(distance) < Math.abs(event.clientY - drag.y)) return
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.style.scrollSnapType = 'none'
      setDragging(true)
    }
    event.preventDefault()
    event.currentTarget.scrollLeft = drag.left - distance
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.id) return
    dragRef.current = null
    setDragging(false)
    if (!drag.moved) return
    suppressClickRef.current = !cancelled
    event.currentTarget.style.removeProperty('scroll-snap-type')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    goTo(nearest())
  }

  if (!reports.length) return null

  return (
    <div className="mt-4 min-w-0">
      <div
        ref={viewportRef}
        id={id}
        role="region"
        aria-roledescription="캐러셀"
        aria-label="다른 관점의 기사"
        tabIndex={0}
        onScroll={() => setActive(nearest())}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={event => finishDrag(event)}
        onPointerCancel={event => finishDrag(event, true)}
        onLostPointerCapture={event => finishDrag(event, true)}
        onClickCapture={event => {
          if (!suppressClickRef.current) return
          suppressClickRef.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        onKeyDown={event => {
          const target = event.key === 'ArrowRight' ? current + 1 : event.key === 'ArrowLeft' ? current - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? reports.length - 1 : null
          if (target === null) return
          event.preventDefault()
          goTo(target)
        }}
        className={'relative -mx-5 flex gap-3 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 [scrollbar-width:none] ' + (dragging ? 'cursor-grabbing' : 'snap-x snap-mandatory cursor-grab')}
      >
        {reports.map((report, index) => (
          <button
            key={report.id}
            data-report-card
            type="button"
            aria-label={`${index + 1}번 비교 기사, ${report.relation === 'opposing' ? '반대 주장을 다룬 보도, ' : ''}${report.koreanTitle || report.title}`}
            onClick={() => onRelated(report)}
            className="flex h-[229px] w-[280px] max-w-[calc(100%_-_16px)] shrink-0 cursor-pointer snap-start select-none flex-col items-start gap-2 rounded-xl border border-line p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <span className={'rounded px-2 text-xs leading-6 font-medium text-secondary ' + (report.kind === 'same-event' ? 'bg-surface' : 'border border-[#d1d8e0]')}>
              {report.kind === 'same-event' ? '같은 사건 보도' : '다른 관점'}
            </span>
            <p className="w-full truncate text-xs leading-[18px] text-[#8b95a1]">{report.publisher} · {formatDate(report.publishedAt)}</p>
            <h3 className="line-clamp-2 text-base leading-6 font-bold">{report.koreanTitle || report.title}</h3>
            <p className="line-clamp-2 text-sm leading-[21px] text-muted">강조한 내용: {report.viewpoint || report.focus}</p>
            <span className="mt-auto flex w-full items-center justify-center gap-1 border-t border-line pt-2 text-sm font-medium text-secondary">자세히 보기 <img src="/images/ui/next.svg" width="16" height="16" alt="" /></span>
          </button>
        ))}
      </div>
      {reports.length > 1 && <div className="mt-2 flex justify-center" aria-label="비교 기사 이동">
        {reports.map((report, index) => (
          <button key={report.id} type="button" aria-label={`${index + 1}번 기사 보기`} aria-controls={id} aria-current={current === index || undefined} onClick={() => goTo(index)} className="grid h-6 w-3 cursor-pointer place-items-center focus-visible:outline-2">
            <span className={'size-1.5 rounded-full ' + (current === index ? 'bg-[#333d4b]' : 'bg-[#d5dce5]')} />
          </button>
        ))}
      </div>}
    </div>
  )
}
