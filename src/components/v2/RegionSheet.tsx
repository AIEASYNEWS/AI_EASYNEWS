import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { LineIcon } from '../ui/LineIcon'
import { REGIONS, type Region } from '../../constants/regions'
import { PillButton } from './Controls'

/** 사는 지역 바텀시트: 시·도 (left) / 시·군·구 (right). Used by A1-1 and A2-3. */
export function RegionSheet({ open, initial, onClose, onSelect, pending }: { open: boolean; initial?: Region | null; onClose: () => void; onSelect: (region: Region) => void; pending?: boolean }) {
  const [sido, setSido] = useState(initial?.sido ?? REGIONS[0].sido)
  const [sigungu, setSigungu] = useState(initial?.sigungu ?? '')
  const current = REGIONS.find(region => region.sido === sido) ?? REGIONS[0]
  return <Dialog open={open} labelledBy="region-sheet-title" onClose={onClose} sheet className="flex max-h-[85svh]! flex-col overflow-hidden! px-0! pt-2! pb-0!">
    <span aria-hidden="true" className="mx-auto block h-1 w-9 shrink-0 rounded-full bg-[#d5dce5]" />
    <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
      <h2 id="region-sheet-title" className="text-lg font-bold">사는 지역</h2>
      <button type="button" aria-label="닫기" onClick={onClose} className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-surface"><LineIcon name="close" /></button>
    </div>
    <div className="flex min-h-0 flex-1 border-t border-line" style={{ height: 420 }}>
      <ul role="listbox" aria-label="시·도" className="w-[144px] shrink-0 overflow-y-auto bg-surface py-1">
        {REGIONS.map(region => <li key={region.sido} role="option" aria-selected={region.sido === sido}>
          <button type="button" onClick={() => { setSido(region.sido); setSigungu('') }}
            className={`h-12 w-full cursor-pointer px-4 text-left text-sm ${region.sido === sido ? 'bg-white font-bold text-ink' : 'text-muted'}`}>{region.sido}</button>
        </li>)}
      </ul>
      <ul role="listbox" aria-label="시·군·구" className="min-w-0 flex-1 overflow-y-auto px-5 py-1">
        {current.sigungu.map(name => <li key={name} role="option" aria-selected={name === sigungu} className="border-b border-line">
          <button type="button" onClick={() => setSigungu(name)} className={`flex h-12 w-full cursor-pointer items-center justify-between text-left text-sm ${name === sigungu ? 'font-bold text-ink' : 'text-secondary'}`}>
            {name}{name === sigungu && <LineIcon name="check" size={20} />}</button>
        </li>)}
      </ul>
    </div>
    <div className="shrink-0 border-t border-line px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
      <PillButton className="w-full" disabled={!sigungu || pending} onClick={() => onSelect({ sido, sigungu })}>{pending ? '저장하고 있어요' : '선택 완료'}</PillButton>
    </div>
  </Dialog>
}
