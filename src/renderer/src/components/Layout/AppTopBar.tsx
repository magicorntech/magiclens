import { useClusterStore } from '../../stores/clusterStore'
import { ChromeActions } from './ChromeActions'

/** Top chrome when cluster tab strip is hidden (clusters / VPN / empty). */
export function AppTopBar(): React.JSX.Element | null {
  const activeView = useClusterStore((s) => s.activeView)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const stripOwnsActions = activeView === 'tabs' && openedTabs.length > 0

  if (stripOwnsActions) return null

  return (
    <header className="app-top-bar titlebar-drag-region">
      <div className="app-top-bar-leading titlebar-no-drag" aria-hidden />
      <div className="app-top-bar-actions titlebar-no-drag">
        <ChromeActions />
      </div>
    </header>
  )
}
