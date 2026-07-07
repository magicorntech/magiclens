import { Button, Empty, Splitter, Tabs, Tooltip } from 'antd'
import type { TabsProps } from 'antd'
import { SplitCellsOutlined } from '@ant-design/icons'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { ClusterView } from '../../pages/ClusterView'
import { ClusterAvatar } from './ClusterAvatar'
import { SplitClusterPane } from './SplitClusterPane'

export function ClusterTabBar(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const splitView = useClusterStore((s) => s.splitView)
  const splitLeftClusterId = useClusterStore((s) => s.splitLeftClusterId)
  const splitRightClusterId = useClusterStore((s) => s.splitRightClusterId)
  const focusedSplitPane = useClusterStore((s) => s.focusedSplitPane)
  const setActiveCluster = useClusterStore((s) => s.setActiveCluster)
  const closeClusterTab = useClusterStore((s) => s.closeClusterTab)
  const enableSplitView = useClusterStore((s) => s.enableSplitView)
  const disableSplitView = useClusterStore((s) => s.disableSplitView)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)

  const openClusters = openedTabs
    .map((id) => clusters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)

  const tabItems: TabsProps['items'] = openClusters.map((cluster) => ({
    key: cluster.id,
    label: showClusterTabLogos ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 180 }}>
        <ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={18} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cluster.customName}</span>
      </span>
    ) : (
      cluster.customName
    )
  }))

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string): void {
    closeClusterTab(targetKey as string)
  }

  function toggleSplit(): void {
    if (splitView) disableSplitView()
    else enableSplitView()
  }

  const canSplit = openClusters.length >= 2

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingRight: 8,
          borderBottom: '1px solid var(--ml-border-secondary)',
          background: 'var(--ml-bg-container)'
        }}
      >
        <Tabs
          className="cluster-tabs-bar-only"
          type="editable-card"
          hideAdd
          activeKey={activeClusterId ?? undefined}
          onChange={setActiveCluster}
          onEdit={handleEdit}
          items={tabItems}
          style={{ flex: 1, minWidth: 0 }}
          tabBarStyle={{ margin: 0 }}
        />
        <Tooltip title={splitView ? 'Exit split view' : 'Split screen — browse two clusters side by side'}>
          <Button
            type={splitView ? 'primary' : 'default'}
            icon={<SplitCellsOutlined />}
            disabled={!splitView && !canSplit}
            onClick={toggleSplit}
          />
        </Tooltip>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {splitView && splitLeftClusterId && splitRightClusterId ? (
          <Splitter style={{ height: '100%' }}>
            <Splitter.Panel defaultSize="50%" min="20%">
              <SplitClusterPane
                clusterId={splitLeftClusterId}
                pane="left"
                focused={focusedSplitPane === 'left'}
              />
            </Splitter.Panel>
            <Splitter.Panel defaultSize="50%" min="20%">
              <SplitClusterPane
                clusterId={splitRightClusterId}
                pane="right"
                focused={focusedSplitPane === 'right'}
              />
            </Splitter.Panel>
          </Splitter>
        ) : activeClusterId ? (
          <ClusterView clusterId={activeClusterId} />
        ) : (
          <Empty description="Open a cluster tab to get started" style={{ marginTop: 48 }} />
        )}
      </div>
    </div>
  )
}
