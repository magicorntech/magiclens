import { Empty, Splitter } from 'antd'
import { useClusterStore } from '../../stores/clusterStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterView } from '../../pages/ClusterView'
import { ClusterTabStrip } from './ClusterTabStrip'
import { SplitClusterPane } from './SplitClusterPane'

export function ClusterTabBar(): React.JSX.Element {
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const splitView = useClusterStore((s) => s.splitView)
  const splitLeftClusterId = useClusterStore((s) => s.splitLeftClusterId)
  const splitRightClusterId = useClusterStore((s) => s.splitRightClusterId)
  const focusedSplitPane = useClusterStore((s) => s.focusedSplitPane)
  const layoutMode = useLayoutMode()
  const allowClusterSplit = canUseSplitLayouts(layoutMode)

  return (
    <div className="ml-cluster-workspace">
      {!(splitView && allowClusterSplit && splitLeftClusterId && splitRightClusterId) && <ClusterTabStrip />}
      <div className="ml-cluster-workspace-body">
        {splitView && allowClusterSplit && splitLeftClusterId && splitRightClusterId ? (
          <Splitter style={{ height: '100%' }}>
            <Splitter.Panel defaultSize="50%" min="20%">
              <SplitClusterPane clusterId={splitLeftClusterId} pane="left" focused={focusedSplitPane === 'left'} />
            </Splitter.Panel>
            <Splitter.Panel defaultSize="50%" min="20%">
              <SplitClusterPane clusterId={splitRightClusterId} pane="right" focused={focusedSplitPane === 'right'} />
            </Splitter.Panel>
          </Splitter>
        ) : activeClusterId ? (
          <ClusterView clusterId={activeClusterId} />
        ) : (
          <Empty description="Open a cluster tab to get started" className="ml-cluster-empty" />
        )}
      </div>
    </div>
  )
}
