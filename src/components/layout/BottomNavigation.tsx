import { Icon } from '../ui/Icon'

interface BottomNavigationProps {
  onHome: () => void
  onExplore: () => void
  onMyPage: () => void
}

export function BottomNavigation({ onHome, onExplore, onMyPage }: BottomNavigationProps) {
  const items = [
    { label: '홈', icon: 'home', onClick: onHome, active: true },
    { label: '탐색', icon: 'explore', onClick: onExplore, active: false },
    { label: '마이', icon: 'profile', onClick: onMyPage, active: false },
  ] as const

  return (
    <nav aria-label="하단 메뉴" className="grid min-h-14 grid-cols-3 bg-white">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick} aria-current={item.active ? 'page' : undefined} className={`flex cursor-pointer flex-col items-center justify-center gap-1 py-1 text-xs leading-[18px] focus-visible:outline-2 focus-visible:-outline-offset-2 ${item.active ? 'font-bold text-[#111111]' : 'text-[#777777]'}`}>
          <Icon name={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  )
}
