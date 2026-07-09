import { useMemo, useState } from 'react'
import { Empty, List } from 'antd'
import { Plus } from 'lucide-react'
import { useClusterStore } from '../stores/clusterStore'
import type { ClusterEntry } from '../stores/clusterStore'
import { applyClusterFilterAndSearch } from '../clusterFilter'
import type { ClusterFilter } from '../clusterFilter'
import { ClusterListRow } from '../components/ClusterTabs/ClusterListRow'
import { ClusterFilterBar } from '../components/ClusterTabs/ClusterFilterBar'
import { ClusterSearchInput } from '../components/ClusterTabs/ClusterSearchInput'
import { EditClusterModal } from '../components/ClusterTabs/EditClusterModal'
import { Icon } from '../components/ui/Icon'

export function ClusterListPage(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const setAddClusterModalOpen = useClusterStore((s) => s.setAddClusterModalOpen)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClusterFilter>('all')
  const [editingCluster, setEditingCluster] = useState<ClusterEntry | null>(null)

  const filtered = useMemo(() => applyClusterFilterAndSearch(clusters, filter, search), [clusters, filter, search])

  const stats = useMemo(() => {
    const connected = clusters.filter((c) => c.status === 'connected').length
    const favorites = clusters.filter((c) => c.isFavorite).length
    const issues = clusters.filter((c) => c.status === 'error' || c.status === 'disconnected').length
    return { total: clusters.length, connected, favorites, issues }
  }, [clusters])

  return (
    <div className="ml-cluster-hub">
      <header className="ml-cluster-hub-header">
        <div className="ml-cluster-hub-header-main">
          <div>
            <h1 className="ml-cluster-hub-title">Clusters</h1>
            <p className="ml-cluster-hub-subtitle">
              Add, connect, and manage all Kubernetes clusters from one place.
            </p>
          </div>
          <button type="button" className="ml-btn ml-btn--primary" onClick={() => setAddClusterModalOpen(true)}>
            <Icon icon={Plus} variant="action" />
            <span>Add cluster</span>
          </button>
        </div>

        <div className="ml-cluster-hub-stats">
          <div className="ml-cluster-hub-stat">
            <span className="ml-cluster-hub-stat-value">{stats.total}</span>
            <span className="ml-cluster-hub-stat-label">Total</span>
          </div>
          <div className="ml-cluster-hub-stat">
            <span className="ml-cluster-hub-stat-value">{stats.connected}</span>
            <span className="ml-cluster-hub-stat-label">Connected</span>
          </div>
          <div className="ml-cluster-hub-stat">
            <span className="ml-cluster-hub-stat-value">{stats.favorites}</span>
            <span className="ml-cluster-hub-stat-label">Favorites</span>
          </div>
          {stats.issues > 0 && (
            <div className="ml-cluster-hub-stat ml-cluster-hub-stat--warning">
              <span className="ml-cluster-hub-stat-value">{stats.issues}</span>
              <span className="ml-cluster-hub-stat-label">Needs attention</span>
            </div>
          )}
        </div>

        <div className="ml-cluster-hub-toolbar">
          <ClusterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, context, endpoint, namespace, version…"
          />
          <ClusterFilterBar value={filter} onChange={setFilter} />
        </div>
      </header>

      <div className="ml-cluster-hub-body">
        {filtered.length === 0 ? (
          <div className="ml-cluster-hub-empty">
            <Empty
              description={
                clusters.length === 0
                  ? 'No clusters yet. Add your first cluster to get started.'
                  : 'No clusters match your search or filter.'
              }
            />
            {clusters.length === 0 && (
              <button type="button" className="ml-btn ml-btn--primary" onClick={() => setAddClusterModalOpen(true)}>
                <Icon icon={Plus} variant="action" />
                <span>Add your first cluster</span>
              </button>
            )}
          </div>
        ) : (
          <List
            className="ml-cluster-hub-list"
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
