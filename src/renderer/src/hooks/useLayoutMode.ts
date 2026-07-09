import { useEffect, useState } from 'react'

export type LayoutMode = 'mobile' | 'compact' | 'desktop'

export const LAYOUT_BREAKPOINTS = {
  mobile: 768,
  compact: 1024
} as const

function resolveLayoutMode(width: number): LayoutMode {
  if (width <= LAYOUT_BREAKPOINTS.mobile) return 'mobile'
  if (width <= LAYOUT_BREAKPOINTS.compact) return 'compact'
  return 'desktop'
}

export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() => resolveLayoutMode(window.innerWidth))

  useEffect(() => {
    const update = (): void => setMode(resolveLayoutMode(window.innerWidth))
    const mqCompact = window.matchMedia(`(max-width: ${LAYOUT_BREAKPOINTS.compact}px)`)
    mqCompact.addEventListener('change', update)
    window.addEventListener('resize', update)
    update()
    return () => {
      mqCompact.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return mode
}

export function canUseSplitLayouts(mode: LayoutMode): boolean {
  return mode === 'desktop'
}

export function usesOverlayNavigation(mode: LayoutMode): boolean {
  return mode !== 'desktop'
}
