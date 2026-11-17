import { useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RelatedReport } from '../../types/news'
import { formatDate } from '../../utils/date'
import { Icon } from '../ui/Icon'

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
        className={'relative -mx-1 grid auto-cols-[min(292px,calc(100%_-_24px))] grid-flow-col grid-rows-[auto_auto_auto_auto_auto] gap-x-3 overflow-x-auto overscroll-x-contain scroll-px-1 px-1 pb-3 outline-offset-4 [scrollbar-width:thin] [scrollbar-color:#cccccc_transparent] ' + (dragging ? 'cursor-grabbing' : 'snap-x snap-mandatory cursor-grab')}
      >
        {reports.map((report, index) => (
          <button
            key={report.id}
            data-report-card
            type="button"
            aria-label={(index + 1) + '번 비교 기사: ' + report.title}
            onClick={() => onRelated(report)}
            className="row-span-5 grid grid-rows-subgrid content-start items-start snap-start select-none rounded-xl border border-[#dddddd] p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <div className="flex items-start"><span className="rounded bg-[#f5f5f5] px-2 py-1 text-xs leading-[18px] text-[#333333]">{report.viewpoint || (report.kind === 'same-event' ? '같은 사건 보도' : '다른 관점')}</span></div>
            <p className="mt-3 text-xs leading-[18px] text-[#777777]">{report.publisher} · {formatDate(report.publishedAt)}</p>
            <h3 className="mt-2 text-base leading-6 font-bold break-keep [overflow-wrap:anywhere]">{report.title}</h3>
            <p className="mt-2 text-sm leading-[21px] break-keep text-[#777777] [overflow-wrap:anywhere]">원문과 다른 점: {report.focus}</p>
            <div className={report.originalEvidence && report.relatedEvidence ? 'mt-3 space-y-2 border-t border-[#dddddd] pt-3 text-xs leading-[18px] text-[#777777]' : ''}>
              {report.originalEvidence && report.relatedEvidence && <><p>원문 근거: “{report.originalEvidence}”</p><p>비교 기사 근거: “{report.relatedEvidence}”</p></>}
            </div>
          </button>
        ))}
      </div>
      {reports.length > 1 && <div className="mt-3 flex items-center justify-between gap-2" aria-label="비교 기사 이동">
        <button type="button" aria-label="이전 비교 기사" aria-controls={id} disabled={current === 0} onClick={() => goTo(current - 1)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#dddddd] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"><Icon name="back" /></button>
        <div className="flex min-w-0 flex-col items-center">
          <div className="flex justify-center" aria-label="비교 기사 페이지">{reports.map((report, index) => <button key={report.id} type="button" aria-label={(index + 1) + '번 기사 보기'} aria-controls={id} aria-current={current === index ? 'true' : undefined} onClick={() => goTo(index)} className="flex size-8 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2"><span className={'size-1.5 rounded-full ' + (current === index ? 'bg-[#333333]' : 'bg-[#dddddd]')} /></button>)}</div>
          <p aria-live="polite" aria-atomic="true" className="text-xs leading-[18px] text-[#777777]">{current + 1} / {reports.length}</p>
        </div>
        <button type="button" aria-label="다음 비교 기사" aria-controls={id} disabled={current === reports.length - 1} onClick={() => goTo(current + 1)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#dddddd] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"><span className="rotate-180"><Icon name="back" /></span></button>
      </div>}
    </div>
  )
}
