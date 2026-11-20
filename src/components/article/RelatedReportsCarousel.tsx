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
          <article
            key={report.id}
            data-report-card
            aria-label={`${index + 1}번 비교 기사, ${report.publisher}`}
            className="flex w-[min(360px,92%)] shrink-0 snap-start flex-col gap-3 rounded-xl border border-line p-4 break-keep [overflow-wrap:anywhere]"
          >
            <p className="text-xs leading-[18px] text-muted">{report.publisher} · {formatDate(report.publishedAt)}</p>
            <h3 className="text-base leading-6 font-bold text-[#1e6beb]">{report.focus || report.viewpoint || report.koreanTitle || report.title}</h3>
            {report.summary?.length ? (
              <div className="space-y-1 text-sm leading-[21px]">
                <h4 className="font-semibold">기사 요약</h4>
                {report.summary.map((sentence, i) => <p key={i}>{sentence}</p>)}
              </div>
            ) : report.relatedEvidence && (
              <div className="text-sm leading-[21px]">
                <h4 className="font-semibold">기사 속 문장</h4>
                <blockquote className="mt-1">{report.relatedEvidence}</blockquote>
              </div>
            )}
            <div className="mt-auto border-t border-line pt-3 text-xs text-secondary">
              {report.sourceUrl ? <>
                <button type="button" onClick={() => onRelated(report)} className="block cursor-pointer text-left leading-5 underline">{report.koreanTitle || report.title}</button>
                <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium underline">{report.publisher} 원문 보기</a>
              </> : <p>{report.koreanTitle || report.title}</p>}
            </div>
          </article>
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
