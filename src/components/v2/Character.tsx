/** 토리, the app's character (Figma: Character/Placeholder, now the final artwork). Cropped to the visible figure. */
export function Character({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src="/images/tori/tori.png" alt="" aria-hidden="true" width={size} height={size} draggable={false}
    style={{ width: size, height: size }} className={`shrink-0 object-contain ${className}`} />
}

/** Chatbot/FAB: 오른쪽 20, 하단 메뉴(또는 하단 여백) 위 16. */
export function ChatFab({ onClick, label = '토리에게 물어보기', aboveNavigation = false }: { onClick: () => void; label?: string; aboveNavigation?: boolean }) {
  return <button type="button" aria-label={label} onClick={onClick}
    className={`absolute right-5 z-20 ${aboveNavigation ? 'bottom-[calc(56px+env(safe-area-inset-bottom)+16px)]' : 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+16px)]'} flex size-[72px] cursor-pointer items-center justify-center rounded-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.16)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none`}>
    <Character size={68} />
  </button>
}
