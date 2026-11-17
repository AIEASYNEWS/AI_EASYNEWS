import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  labelledBy: string
  onClose: () => void
  children: ReactNode
  sheet?: boolean
}

export function Dialog({ open, labelledBy, onClose, children, sheet = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      className={`fixed m-auto max-h-[85svh] overflow-y-auto border-0 bg-white font-['Noto_Sans_KR',sans-serif] text-ink outline-none backdrop:bg-black/50 ${sheet ? 'inset-x-0 top-auto bottom-0 mb-0 w-full max-w-[390px] rounded-t-3xl px-5 pt-2 pb-[max(24px,env(safe-area-inset-bottom))]' : 'inset-0 w-[calc(100%_-_40px)] max-w-[350px] rounded-2xl p-6'}`}
    >
      {children}
    </dialog>
  )
}
