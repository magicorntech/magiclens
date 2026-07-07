import { useClusterStore } from '../stores/clusterStore'

/** True only when the cluster has an active main-process client (status === connected). */
export function useClusterConnected(clusterId: string | null | undefined): boolean {
  return useClusterStore((s) => {
    if (!clusterId) return false
    return s.clusters.find((c) => c.id === clusterId)?.status === 'connected'
  })
}
