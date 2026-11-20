import { useEffect, useRef, useState, type RefObject } from 'react'

export interface DragSelection { text: string; top: number; left: number }

/**
 * Tracks a text selection (drag) inside `containerRef`. While the pointer is down the selection is
 * highlighted with a hint; releasing it hands the selected text to `onAsk` (기사별 대화방 시작).
 */
export function useDragToAsk(containerRef: RefObject<HTMLElement | null>, onAsk: (text: string) => void, enabled = true) {
  const [selection, setSelection] = useState<DragSelection | null>(null)
  const pressing = useRef(false)
  const ask = useRef(onAsk)
  useEffect(() => { ask.current = onAsk }, [onAsk])
  useEffect(() => {
    if (!enabled) return
    const read = () => {
      const selected = window.getSelection()
      const container = containerRef.current
      if (!selected || selected.isCollapsed || !container || !container.contains(selected.anchorNode) || !container.contains(selected.focusNode)) return null
      const text = selected.toString().replace(/\s+/g, ' ').trim().slice(0, 2000)
      if (text.length < 2) return null
      const rect = selected.getRangeAt(0).getBoundingClientRect()
      const box = container.getBoundingClientRect()
      return { text, top: rect.top - box.top, left: Math.min(Math.max(rect.left - box.left, 0), Math.max(box.width - 240, 0)) }
    }
    const onChange = () => setSelection(read())
    const onDown = () => { pressing.current = true }
    const onUp = () => {
      if (!pressing.current) return
      pressing.current = false
      // Let the browser settle the final selection range before reading it.
      window.setTimeout(() => {
        const current = read()
        if (!current) return
        window.getSelection()?.removeAllRanges()
        setSelection(null)
        ask.current(current.text)
      }, 60)
    }
    document.addEventListener('selectionchange', onChange)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [containerRef, enabled])
  return selection
}
