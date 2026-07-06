import { useMemo, useState } from 'react'
import { Empty, List, Space } from 'antd'
import { useClusterStore } from '../stores/clusterStore'
import type { ClusterEntry } from '../stores/clusterStore'
import { applyClusterFilterAndSearch } from '../clusterFilter'
import type { ClusterFilter } from '../clusterFilter'
import { ClusterListRow } from '../components/ClusterTabs/ClusterListRow'
import { ClusterFilterBar } from '../components/ClusterTabs/ClusterFilterBar'
import { ClusterSearchInput } from '../components/ClusterTabs/ClusterSearchInput'
import { EditClusterModal } from '../components/ClusterTabs/EditClusterModal'

export function ClusterListPage(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClusterFilter>('all')
  const [editingCluster, setEditingCluster] = useState<ClusterEntry | null>(null)

  const filtered = useMemo(() => applyClusterFilterAndSearch(clusters, filter, search), [clusters, filter, search])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%', padding: '24px 24px 0', flexShrink: 0 }}>
        <ClusterSearchInput value={search} onChange={setSearch} placeholder="Search by name, context, endpoint, namespace, version..." />
        <ClusterFilterBar value={filter} onChange={setFilter} />
      </Space>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 24 }}>
        {filtered.length === 0 ? (
          <Empty description={clusters.length === 0 ? 'No clusters added yet' : 'No clusters match your search'} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filtered}
            renderItem={(cluster) => (
              <ClusterListRow cluster={cluster} searchQuery={search} onEdit={setEditingCluster} />
            )}
            rowKey="id"
          />
        )}
      </div>

      <EditClusterModal cluster={editingCluster} onClose={() => setEditingCluster(null)} />
    </div>
  )
}
