import { Empty, Splitter } from 'antd'
import { Layers } from 'lucide-react'
import logo from '../../assets/logo.png'
import { useClusterStore } from '../../stores/clusterStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterView } from '../../pages/ClusterView'
import { Icon } from '../ui/Icon'
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
          <div className="ml-cluster-empty">
            <img src={logo} alt="" className="ml-cluster-empty__logo" width={64} height={64} />
            <div className="ml-cluster-empty__icon">
              <Icon icon={Layers} variant="action" />
            </div>
            <h3 className="ml-cluster-empty__title">Open a cluster tab to get started</h3>
            <p className="ml-cluster-empty__desc">
              Pick a favorite or workspace cluster from the sidebar, or open one from the Clusters page.
            </p>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
          </div>
        )}
      </div>
    </div>
  )
}
