import { useEffect } from 'react'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterHeaderTabs } from './ClusterHeaderTabs'

/** Cluster tabs flush-left at the workspace edge. */
export function ClusterTabStrip(): React.JSX.Element | null {
  const activeView = useClusterStore((s) => s.activeView)

  if (activeView === 'clusters' || activeView === 'admin' || activeView === 'profile' || activeView === 'vpn')
    return null

  return (
    <div className="ml-cluster-tab-strip">
      <div className="ml-cluster-tab-strip-tabs">
        <ClusterHeaderTabs />
      </div>
    </div>
  )
}
