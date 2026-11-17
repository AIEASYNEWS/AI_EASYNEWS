
interface BottomNavigationProps {
  active?: 'home' | 'explore' | 'my'
  onHome: () => void
  onExplore: () => void
  onMyPage: () => void
}

export function BottomNavigation({ onHome, onExplore, onMyPage, active = 'home' }: BottomNavigationProps) {
  const items = [
    { label: '홈', icon: 'home', onClick: onHome, active: active === 'home' },
    { label: '탐색', icon: 'explore', onClick: onExplore, active: active === 'explore' },
    { label: '마이', icon: 'my', onClick: onMyPage, active: active === 'my' },
  ] as const

  return (
    <nav aria-label="하단 메뉴" className="grid min-h-14 grid-cols-3 bg-white">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick} aria-current={item.active ? 'page' : undefined} className={`flex cursor-pointer flex-col items-center justify-center gap-1 py-1 text-xs leading-[18px] focus-visible:outline-2 focus-visible:-outline-offset-2 ${item.active ? 'font-bold text-brand' : 'text-muted'}`}>
          <img src={`/images/ui/nav-${item.icon}${item.active ? '-on' : ''}.svg`} alt="" width="24" height="24" />
          {item.label}
        </button>
      ))}
    </nav>
  )
}
