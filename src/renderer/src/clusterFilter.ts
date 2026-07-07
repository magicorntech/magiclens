import type { ClusterEntry } from './stores/clusterStore'

export type ClusterFilter = 'all' | 'favorites' | 'connected' | 'disconnected' | 'error' | 'recent'

export const clusterFilterOptions: { label: string; value: ClusterFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Favorites', value: 'favorites' },
  { label: 'Connected', value: 'connected' },
  { label: 'Disconnected', value: 'disconnected' },
  { label: 'Error', value: 'error' },
  { label: 'Recently opened', value: 'recent' }
]

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
    cluster.selectedNamespace.toLowerCase().includes(q) ||
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
  return filtered
}
