import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

interface OnboardingLayoutProps {
  children: ReactNode
  footer: ReactNode
  title?: string
  action?: { label: string; icon: 'close' | 'back'; onClick: () => void }
  pageTitle: string
}

export function OnboardingLayout({ children, footer, title, action, pageTitle }: OnboardingLayoutProps) {
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${pageTitle} | NUTORI`
    pageRef.current?.focus({ preventScroll: true })
  }, [pageTitle])

  return (
    <div
      ref={pageRef}
      tabIndex={-1}
      className="relative mx-auto flex min-h-svh w-full max-w-[390px] flex-col bg-white font-['Noto_Sans_KR',sans-serif] text-ink outline-none"
    >
      <div aria-hidden="true" className="h-[max(8px,env(safe-area-inset-top))] shrink-0" />
      <header className="relative flex h-14 shrink-0 items-center justify-center px-5">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.label}
            className="absolute left-3 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Icon name={action.icon} />
          </button>
        )}
        {title && <h1 className="text-lg leading-[26px] font-bold text-ink">{title}</h1>}
      </header>
      <main className="flex-1 px-5 py-6">{children}</main>
      <footer className="shrink-0 border-t border-line px-5 pt-4 pb-4">{footer}</footer>
      <div aria-hidden="true" className="h-[max(34px,env(safe-area-inset-bottom))] shrink-0" />
    </div>
  )
}
