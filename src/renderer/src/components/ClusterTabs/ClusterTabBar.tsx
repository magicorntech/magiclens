import { Empty, Splitter } from 'antd'
import { Layers } from 'lucide-react'
import logo from '../../assets/logo.png'
import { CLUSTER_SPLIT_PANEL_MIN_PX } from '../../constants/clusterSplitLimits'
import { useClusterStore } from '../../stores/clusterStore'
import { useAiAgentStore } from '../../stores/aiAgentStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterView } from '../../pages/ClusterView'
import { Icon } from '../ui/Icon'
import { AiAssistantPanel } from '../Layout/AiAssistantPanel'
import { SplitClusterPane } from './SplitClusterPane'

export function ClusterTabBar(): React.JSX.Element {
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const splitView = useClusterStore((s) => s.splitView)
  const splitLeftClusterId = useClusterStore((s) => s.splitLeftClusterId)
  const splitRightClusterId = useClusterStore((s) => s.splitRightClusterId)
  const focusedSplitPane = useClusterStore((s) => s.focusedSplitPane)
  const clusters = useClusterStore((s) => s.clusters)
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const assistantOpen = useAiAgentStore((s) => s.panelOpen)
  const layoutMode = useLayoutMode()
  const allowClusterSplit = canUseSplitLayouts(layoutMode)
  const splitActive = Boolean(splitView && allowClusterSplit && splitLeftClusterId && splitRightClusterId)
  const focusedClusterId = focusedSplitPane === 'right' ? splitRightClusterId : splitLeftClusterId
  const focusedCluster = clusters.find((cluster) => cluster.id === focusedClusterId) ?? null
  const showSplitAssistant = splitActive && !hideAssistant && assistantOpen && focusedCluster != null

  return (
    <div className="ml-cluster-workspace">
      <div className={`ml-cluster-workspace-body${showSplitAssistant ? ' ml-cluster-workspace-body--assistant' : ''}`}>
        {splitActive && splitLeftClusterId && splitRightClusterId ? (
          <>
            <div className="ml-cluster-workspace-split">
              <Splitter style={{ height: '100%' }}>
                <Splitter.Panel defaultSize="50%" min={CLUSTER_SPLIT_PANEL_MIN_PX}>
                  <SplitClusterPane clusterId={splitLeftClusterId} pane="left" focused={focusedSplitPane === 'left'} />
                </Splitter.Panel>
                <Splitter.Panel defaultSize="50%" min={CLUSTER_SPLIT_PANEL_MIN_PX}>
                  <SplitClusterPane clusterId={splitRightClusterId} pane="right" focused={focusedSplitPane === 'right'} />
                </Splitter.Panel>
              </Splitter>
            </div>
            {showSplitAssistant && focusedCluster ? (
              <AiAssistantPanel
                clusterId={focusedCluster.id}
                clusterName={focusedCluster.customName || focusedCluster.contextName || focusedCluster.id}
                namespace={focusedCluster.selectedNamespace}
                selectedKind={focusedCluster.selectedResourceKind}
                selectedVirtualPage={focusedCluster.selectedVirtualPage}
              />
            ) : null}
          </>
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
