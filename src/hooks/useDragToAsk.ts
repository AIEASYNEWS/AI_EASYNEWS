import { useEffect, useRef, useState, type RefObject } from 'react'

export interface DragSelection { text: string; top: number; bottom: number; left: number; dragging: boolean }

/**
 * Tracks a text selection (drag) inside `containerRef`. Releasing the drag does not open the chat by
 * itself: the selection stays highlighted and the caller shows an "ask" button next to it.
 */
export function useDragToAsk(containerRef: RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<DragSelection | null>(null)
  const pressing = useRef(false)
  useEffect(() => {
    const read = (dragging: boolean): DragSelection | null => {
      const selected = window.getSelection()
      const container = containerRef.current
      if (!selected || selected.isCollapsed || !selected.rangeCount || !container || !container.contains(selected.anchorNode) || !container.contains(selected.focusNode)) return null
      const text = selected.toString().replace(/\s+/g, ' ').trim().slice(0, 2000)
      if (text.length < 2) return null
      const rect = selected.getRangeAt(0).getBoundingClientRect()
      const box = container.getBoundingClientRect()
      return { text, dragging, top: rect.top - box.top, bottom: rect.bottom - box.top, left: Math.min(Math.max(rect.left - box.left, 0), Math.max(box.width - 180, 0)) }
    }
    const onChange = () => setSelection(read(pressing.current))
    const onDown = (event: Event) => {
      // Pressing the ask button itself must not clear the selection state.
      if ((event.target as Element | null)?.closest?.('[data-ask-button]')) return
      pressing.current = true
    }
    const onUp = () => {
      if (!pressing.current) return
      pressing.current = false
      // Let the browser settle the final range (mobile handles adjust after touchend).
      window.setTimeout(() => setSelection(read(false)), 80)
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
  }, [containerRef])
  return selection
}
