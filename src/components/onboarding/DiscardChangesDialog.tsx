import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'

interface DiscardChangesDialogProps {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

export function DiscardChangesDialog({ open, onKeepEditing, onDiscard }: DiscardChangesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="discard-dialog-title"
      aria-describedby="discard-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        onKeepEditing()
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_40px)] max-w-[350px] rounded-2xl border-0 bg-white p-6 font-['Noto_Sans_KR',sans-serif] text-[#111111] shadow-none backdrop:bg-black/50"
    >
      <h2 id="discard-dialog-title" className="text-center text-xl leading-7 font-bold break-keep">저장하지 않고 나갈까요?</h2>
      <p id="discard-dialog-description" className="mt-2 text-center text-sm leading-[21px] text-[#777777]">바꾼 관심 주제가 저장되지 않아요.</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button autoFocus onClick={onKeepEditing}>계속 고치기</Button>
        <Button variant="secondary" onClick={onDiscard}>저장하지 않고 나가기</Button>
      </div>
    </dialog>
  )
}
