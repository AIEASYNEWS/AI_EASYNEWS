import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

interface PageLayoutProps {
  title: string
  children: ReactNode
  header?: ReactNode
  onBack?: () => void
  footer?: ReactNode
  contentClassName?: string
  scrollMode?: 'content' | 'page'
  hero?: boolean
}

export function PageLayout({ title, children, header, onBack, footer, contentClassName = '', scrollMode = 'content', hero = false }: PageLayoutProps) {
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = `${title} | 쉬운말 뉴스`
    mainRef.current?.focus({ preventScroll: true })
  }, [title])

  const pageHeader = (
    <>
      <div aria-hidden="true" className={`h-11 shrink-0 ${hero ? 'bg-[#999999]' : ''}`} />
      <header className={`flex h-16 shrink-0 items-center justify-between px-5 ${hero ? 'bg-[#999999]' : ''}`}>
        {onBack ? (
          <button type="button" aria-label="뒤로 가기" onClick={onBack} className="-ml-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-[#f5f5f5] focus-visible:outline-2 focus-visible:outline-offset-2">
            <Icon name="back" />
          </button>
        ) : header}
      </header>
    </>
  )

  return (
    <div className={`relative mx-auto flex w-full max-w-[390px] flex-col bg-white font-['Noto_Sans_KR',sans-serif] text-[#111111] ${scrollMode === 'page' ? 'min-h-svh' : 'h-svh overflow-hidden'}`}>
      {pageHeader}
      <main ref={mainRef} tabIndex={-1} className={`flex-1 outline-none ${scrollMode === 'content' ? 'min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''} ${contentClassName}`}>
        {children}
      </main>
      {footer && <div className="shrink-0 border-t border-[#e5e5e5]">{footer}</div>}
      <div aria-hidden="true" className="h-[max(34px,env(safe-area-inset-bottom))] shrink-0" />
    </div>
  )
}
