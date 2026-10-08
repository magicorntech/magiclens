import { useClusterStore } from '../../stores/clusterStore'
import { ClusterHeaderTabs } from './ClusterHeaderTabs'

const IS_MAC = navigator.platform.includes('Mac')

/**
 * Shared top chrome: search/actions always.
 * Cluster tabs only while activeView is `tabs` (not on Clusters / VPN / Sparks / Molly).
 */
export function ClusterTabStrip(): React.JSX.Element {
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
