import { useEffect } from 'react'
import { useClusterStore } from '../stores/clusterStore'
import { canUseSplitLayouts, useLayoutMode } from './useLayoutMode'

export function useResponsiveLayoutEffects(): void {
  const mode = useLayoutMode()
  const splitView = useClusterStore((s) => s.splitView)
  const disableSplitView = useClusterStore((s) => s.disableSplitView)
  const setLeftSidebarCollapsed = useClusterStore((s) => s.setLeftSidebarCollapsed)

  useEffect(() => {
    if (!canUseSplitLayouts(mode) && splitView) {
      disableSplitView()
    }
  }, [mode, splitView, disableSplitView])

  useEffect(() => {
    if (mode === 'mobile') {
      setLeftSidebarCollapsed(true)
    }
  }, [mode, setLeftSidebarCollapsed])
}
