/** 토리, the app's character (Figma: Character/Placeholder, now the final artwork). Cropped to the visible figure. */
export function Character({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src="/images/tori/tori.png" alt="" aria-hidden="true" width={size} height={size} draggable={false}
    style={{ width: size, height: size }} className={`shrink-0 object-contain ${className}`} />
}

/** Chatbot/FAB (Figma "토리 버튼"): 72 white disc with a blue shadow, 토리 and a chat badge. Right 20, 16 above the bottom menu. */
export function ChatFab({ onClick, label = '토리에게 물어보기', aboveNavigation = false }: { onClick: () => void; label?: string; aboveNavigation?: boolean }) {
  return <button type="button" aria-label={label} onClick={onClick}
    className={`absolute right-5 z-20 ${aboveNavigation ? 'bottom-[calc(56px+env(safe-area-inset-bottom)+16px)]' : 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+16px)]'} size-[72px] cursor-pointer rounded-full border border-line bg-white drop-shadow-[0_4px_8px_rgba(30,107,235,0.22)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none`}>
    <img src="/images/tori/tori.png" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute top-[7px] left-[11px] h-[51px] w-[47px] max-w-none" />
    <span aria-hidden="true" className="absolute top-[-6px] left-[51px] size-6 overflow-hidden rounded-xl border-[1.5px] border-white bg-brand">
      <img src="/images/tori/chat-badge.svg" alt="" className="absolute top-2 left-1.5 h-2.5 w-[13px] max-w-none" />
    </span>
  </button>
}
