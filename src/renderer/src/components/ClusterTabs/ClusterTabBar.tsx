import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterView } from '../../pages/ClusterView'

export function ClusterTabBar(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const setActiveCluster = useClusterStore((s) => s.setActiveCluster)
  const closeClusterTab = useClusterStore((s) => s.closeClusterTab)

  const openClusters = openedTabs
    .map((id) => clusters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)

  const items: TabsProps['items'] = openClusters.map((cluster) => ({
    key: cluster.id,
    label: cluster.customName,
    children: <ClusterView clusterId={cluster.id} />
  }))

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string): void {
    closeClusterTab(targetKey as string)
  }

  return (
    <Tabs
      type="editable-card"
      hideAdd
      activeKey={activeClusterId ?? undefined}
      onChange={setActiveCluster}
      onEdit={handleEdit}
      items={items}
      style={{ height: '100%' }}
    />
  )
}
