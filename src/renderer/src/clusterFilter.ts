import { parseNamespaceSelection } from '@shared/namespaceSelection'
import type { ClusterEntry } from './stores/clusterStore'

export type ClusterFilter = 'all' | 'favorites' | 'connected' | 'disconnected' | 'error' | 'recent'

export const clusterFilterValues: ClusterFilter[] = [
  'all',
  'favorites',
  'connected',
  'disconnected',
  'error',
  'recent'
]

function connectionRank(status: ClusterEntry['status']): number {
  switch (status) {
    case 'connected':
      return 0
    case 'connecting':
      return 1
    case 'error':
      return 2
    default:
      return 3
  }
}

/** Connected first, then connecting, error, idle — stable by name within a tier. */
export function sortClustersByConnection(clusters: ClusterEntry[]): ClusterEntry[] {
  return [...clusters].sort((a, b) => {
    const byStatus = connectionRank(a.status) - connectionRank(b.status)
    if (byStatus !== 0) return byStatus
    return (a.customName || a.contextName).localeCompare(b.customName || b.contextName)
  })
}

export function matchesFilter(cluster: ClusterEntry, filter: ClusterFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'favorites':
      return cluster.isFavorite
    case 'connected':
      return cluster.status === 'connected'
    case 'disconnected':
      return cluster.status === 'idle' || cluster.status === 'disconnected'
    case 'error':
      return cluster.status === 'error'
    case 'recent':
      return !!cluster.lastOpenedAt
  }
}

export function matchesSearch(cluster: ClusterEntry, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return (
    cluster.customName.toLowerCase().includes(q) ||
    cluster.contextName.toLowerCase().includes(q) ||
    (cluster.endpoint ?? '').toLowerCase().includes(q) ||
    parseNamespaceSelection(cluster.selectedNamespace).some((ns) => ns.toLowerCase().includes(q)) ||
    (cluster.serverVersion ?? '').toLowerCase().includes(q) ||
    cluster.status.toLowerCase().includes(q)
  )
}

export function applyClusterFilterAndSearch(
  clusters: ClusterEntry[],
  filter: ClusterFilter,
  query: string
): ClusterEntry[] {
  const filtered = clusters.filter((c) => matchesFilter(c, filter) && matchesSearch(c, query))
  if (filter === 'recent') {
    return [...filtered].sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
  }
  return sortClustersByConnection(filtered)
}
