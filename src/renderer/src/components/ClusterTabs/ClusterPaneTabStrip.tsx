import { Tabs, Tooltip } from 'antd'
import type { TabsProps } from 'antd'
import { Columns2 } from 'lucide-react'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { ClusterAvatar } from './ClusterAvatar'

interface ClusterPaneTabStripProps {
  clusterId: string
  pane: 'left' | 'right'
  showSplitControl?: boolean
}

/** Single cluster tab aligned with its split pane. */
export function ClusterPaneTabStrip({
  clusterId,
  pane,
  showSplitControl = false
}: ClusterPaneTabStripProps): React.JSX.Element | null {
  const clusters = useClusterStore((s) => s.clusters)
  const setActiveCluster = useClusterStore((s) => s.setActiveCluster)
  const closeClusterTab = useClusterStore((s) => s.closeClusterTab)
  const setFocusedSplitPane = useClusterStore((s) => s.setFocusedSplitPane)
  const disableSplitView = useClusterStore((s) => s.disableSplitView)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)
  const layoutMode = useLayoutMode()
  const allowClusterSplit = canUseSplitLayouts(layoutMode)

  const cluster = clusters.find((c) => c.id === clusterId)
  if (!cluster) return null

  const tabItems: TabsProps['items'] = [
    {
      key: cluster.id,
      label: showClusterTabLogos ? (
        <span className="ml-cluster-tab-label">
          <ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={16} />
          <span>{cluster.customName}</span>
        </span>
      ) : (
        cluster.customName
      )
    }
  ]

  function handleEdit(): void {
    closeClusterTab(clusterId)
  }

  return (
    <div
      className={`ml-cluster-pane-tab-strip ml-cluster-pane-tab-strip--${pane}`}
      onMouseDown={() => setFocusedSplitPane(pane)}
    >
      <Tabs
        className="cluster-tabs-bar-only ml-cluster-tabs ml-cluster-tabs--pane"
        type="editable-card"
        hideAdd
        size="small"
        activeKey={clusterId}
        onChange={(id) => {
          setFocusedSplitPane(pane)
          setActiveCluster(id)
        }}
        onEdit={handleEdit}
        items={tabItems}
        tabBarStyle={{ margin: 0 }}
      />
      {showSplitControl && allowClusterSplit && (
        <Tooltip title="Exit split view">
          <button
            type="button"
            className="ml-icon-btn ml-icon-btn--sm ml-icon-btn--active"
            onClick={disableSplitView}
            aria-label="Exit split view"
          >
            <Icon icon={Columns2} variant="action" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
