import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { LineIcon } from '../ui/LineIcon'

interface ScreenProps {
  pageTitle: string
  heading?: ReactNode
  onBack?: () => void
  right?: ReactNode
  footer?: ReactNode
  children: ReactNode
  contentClassName?: string
  scrollRef?: RefObject<HTMLElement | null>
  overlay?: ReactNode
}

/** Mobile frame (390pt wide) with a fixed header, scrolling content and optional fixed footer. */
export function Screen({ pageTitle, heading, onBack, right, footer, children, contentClassName = 'px-5', scrollRef, overlay }: ScreenProps) {
  const ownRef = useRef<HTMLElement>(null)
  const ref = scrollRef ?? ownRef
  useEffect(() => {
    document.title = `${pageTitle} | 쉬운말 뉴스`
    ref.current?.focus({ preventScroll: true })
  }, [pageTitle, ref])
  return (
    <div className="relative mx-auto flex h-svh w-full max-w-[390px] flex-col overflow-hidden bg-white font-['Noto_Sans_KR',sans-serif] text-ink">
      <div aria-hidden="true" className="h-[47px] shrink-0" />
      {(heading || onBack || right) && <header className="relative flex h-14 shrink-0 items-center justify-between px-5">
        <div className="flex min-w-10 items-center">
          {onBack && <IconButton label="뒤로 가기" onClick={onBack} className="-ml-2"><LineIcon name="back" /></IconButton>}
        </div>
        {heading && <div className="pointer-events-none absolute inset-x-16 flex items-center justify-center text-center text-lg leading-[26px] font-bold">{heading}</div>}
        <div className="flex min-w-10 items-center justify-end">{right}</div>
      </header>}
      <main ref={ref as RefObject<HTMLElement>} tabIndex={-1} className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${contentClassName}`}>
        {children}
      </main>
      {footer && <div className="shrink-0 border-t border-line bg-white">{footer}</div>}
      {!footer && <div aria-hidden="true" className="h-[max(20px,env(safe-area-inset-bottom))] shrink-0" />}
      {overlay}
    </div>
  )
}

export function IconButton({ label, onClick, children, className = '', pressed }: { label: string; onClick: () => void; children: ReactNode; className?: string; pressed?: boolean }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick}
    className={`flex size-10 cursor-pointer items-center justify-center rounded-lg text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}>{children}</button>
}

export function FooterBar({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return <div className="px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">{note && <p className="mb-2 text-center text-xs leading-[18px] text-muted">{note}</p>}<div className="flex gap-2">{children}</div></div>
}
