/** Placeholder for the 소식이 character until its artwork is final (Figma: Character/Placeholder, "직접 그리지 말 것"). */
export function Character({ size = 40, className = '' }: { size?: 40 | 48 | 56 | 32; className?: string }) {
  return <span aria-hidden="true" style={{ width: size, height: size }}
    className={`inline-flex shrink-0 rounded-full border-[1.5px] border-dashed border-brand bg-brand-soft ${className}`} />
}

export function ChatFab({ onClick, label = '소식이에게 물어보기', aboveNavigation = false }: { onClick: () => void; label?: string; aboveNavigation?: boolean }) {
  return <button type="button" aria-label={label} onClick={onClick}
    className={`absolute right-5 z-20 ${aboveNavigation ? 'bottom-[calc(56px+env(safe-area-inset-bottom)+12px)]' : 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+12px)]'} flex size-14 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}>
    <Character size={56} />
  </button>
}
