import { useCallback, useEffect, useRef, useState } from 'react'

interface UseResizableDrawerWidthOptions {
  /** localStorage key the chosen width is persisted under. */
  storageKey: string
  /** Width to fall back to when nothing is stored yet. */
  defaultWidth: number
  minWidth?: number
  /** Hard cap in px, applied on top of `maxRatio`. */
  maxWidth?: number
  /** Widest the panel may grow, as a fraction of the window width. */
  maxRatio?: number
  /**
   * Which edge of the window the panel is docked on.
   * Left-docked rails grow when the handle is dragged right; right-docked drawers grow left.
   */
  edge?: 'left' | 'right'
}

interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => void
  onDoubleClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

interface ResizableDrawerWidth {
  width: number
  resizing: boolean
  handleProps: ResizeHandleProps
}

function readStoredWidth(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/**
 * Drag-to-resize width for a docked panel, persisted per `storageKey`.
 * Right-docked drawers grow when dragged left; left-docked rails grow when dragged right.
 * Double-click the handle to restore `defaultWidth`.
 */
export function useResizableDrawerWidth({
  storageKey,
  defaultWidth,
  minWidth = 360,
  maxWidth,
  maxRatio = 0.7,
  edge = 'right'
}: UseResizableDrawerWidthOptions): ResizableDrawerWidth {
  const clamp = useCallback(
    (px: number): number => {
      const ratioCap = Math.max(minWidth, Math.floor(window.innerWidth * maxRatio))
      const max = Math.max(minWidth, Math.min(ratioCap, maxWidth ?? ratioCap))
      return Math.min(max, Math.max(minWidth, Math.round(px)))
    },
    [minWidth, maxWidth, maxRatio]
  )

  const [width, setWidth] = useState(() => clamp(readStoredWidth(storageKey) ?? defaultWidth))
  const [resizing, setResizing] = useState(false)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const onWindowResize = (): void => setWidth((w) => clamp(w))
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [clamp])

  const persist = useCallback(
    (px: number): void => {
      const next = clamp(px)
      setWidth(next)
      try {
        localStorage.setItem(storageKey, String(next))
      } catch {
        /* ignore quota / private mode */
      }
    },
    [clamp, storageKey]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.detail === 2) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { startX: e.clientX, startWidth: width }
      setResizing(true)
      document.body.classList.add('ml-detail-resizing')
    },
    [width]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = edge === 'left' ? e.clientX - drag.startX : drag.startX - e.clientX
      persist(drag.startWidth + delta)
    },
    [persist, edge]
  )

  const endResize = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    document.body.classList.remove('ml-detail-resizing')
  }, [])

  useEffect(() => () => document.body.classList.remove('ml-detail-resizing'), [])

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      persist(defaultWidth)
    },
    [persist, defaultWidth]
  )

  return {
    width,
    resizing,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endResize,
      onPointerCancel: endResize,
      onDoubleClick
    }
  }
}
