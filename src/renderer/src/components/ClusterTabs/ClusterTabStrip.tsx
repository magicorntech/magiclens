import { useClusterStore } from '../../stores/clusterStore'
import { ClusterHeaderTabs } from './ClusterHeaderTabs'

const IS_MAC = navigator.platform.includes('Mac')

/** Browser-style cluster tabs flush at the top of the app chrome. */
export function ClusterTabStrip(): React.JSX.Element | null {
  const activeView = useClusterStore((s) => s.activeView)
  const openedTabs = useClusterStore((s) => s.openedTabs)

  if (
    activeView === 'clusters' ||
    activeView === 'vpn' ||
    activeView === 'notes' ||
    activeView === 'admin' ||
    activeView === 'profile' ||
    openedTabs.length === 0
  ) {
    return null
  }
  return (
    <div
      className={`ml-cluster-tab-strip ml-cluster-tab-strip--browser titlebar-drag-region${
        IS_MAC ? ' ml-cluster-tab-strip--traffic' : ''
      }`}
    >
      <div className="ml-cluster-tab-strip-tabs titlebar-no-drag">
        <ClusterHeaderTabs />
      </div>
    </div>
  )
}
