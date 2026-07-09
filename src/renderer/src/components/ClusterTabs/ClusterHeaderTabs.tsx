import { Tabs, Tooltip } from 'antd'
import type { TabsProps } from 'antd'
import { Columns2 } from 'lucide-react'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { ClusterAvatar } from './ClusterAvatar'

/** Browser-style cluster tabs rendered in the global header (left zone). */
export function ClusterHeaderTabs(): React.JSX.Element | null {
  const clusters = useClusterStore((s) => s.clusters)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const splitView = useClusterStore((s) => s.splitView)
  const setActiveCluster = useClusterStore((s) => s.setActiveCluster)
  const closeClusterTab = useClusterStore((s) => s.closeClusterTab)
  const enableSplitView = useClusterStore((s) => s.enableSplitView)
  const disableSplitView = useClusterStore((s) => s.disableSplitView)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)
  const layoutMode = useLayoutMode()
  const allowClusterSplit = canUseSplitLayouts(layoutMode)

  const openClusters = openedTabs
    .map((id) => clusters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)

  if (openClusters.length === 0) return null

  const tabItems: TabsProps['items'] = openClusters.map((cluster) => ({
    key: cluster.id,
    label: showClusterTabLogos ? (
      <span className="ml-cluster-tab-label">
        <ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={16} />
        <span>{cluster.customName}</span>
      </span>
    ) : (
      cluster.customName
    )
  }))

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string): void {
    closeClusterTab(targetKey as string)
  }

  const canSplit = openClusters.length >= 2

  return (
    <div className="ml-cluster-header-tabs titlebar-no-drag">
      <Tabs
        className="cluster-tabs-bar-only ml-cluster-tabs ml-cluster-tabs--header"
        type="editable-card"
        hideAdd
        size="small"
        activeKey={activeClusterId ?? undefined}
        onChange={setActiveCluster}
        onEdit={handleEdit}
        items={tabItems}
        tabBarStyle={{ margin: 0 }}
      />
      {allowClusterSplit && (
        <Tooltip title={splitView ? 'Exit split view' : 'Split screen'}>
          <button
            type="button"
            className={`ml-icon-btn ml-icon-btn--sm${splitView ? ' ml-icon-btn--active' : ''}`}
            disabled={!splitView && !canSplit}
            onClick={() => (splitView ? disableSplitView() : enableSplitView())}
          >
            <Icon icon={Columns2} variant="action" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
