import { useQuery, type QueryClient } from '@tanstack/react-query'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import { useClusterStore } from '../stores/clusterStore'
import { useClusterConnected } from './useClusterConnected'

export function namespacesQueryKey(clusterId: string): readonly ['namespaces', string] {
  return ['namespaces', clusterId]
}

async function fetchNamespaces(clusterId: string) {
  const res = await window.api.cluster.listNamespaces({ clusterId })
  if ('error' in res && res.error === CLUSTER_NOT_CONNECTED) throw new Error(CLUSTER_NOT_CONNECTED)
  return res
}

/** Refetch namespace list for the selector after create/delete or cluster changes. */
export async function refreshNamespaces(queryClient: QueryClient, clusterId: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: namespacesQueryKey(clusterId) })
  try {
    const res = await queryClient.fetchQuery({
      queryKey: namespacesQueryKey(clusterId),
      queryFn: () => fetchNamespaces(clusterId)
    })
    useClusterStore.getState().setClusterNamespaces(clusterId, res.namespaces)
  } catch {
    // Cluster may have disconnected; ignore.
  }
}

export function useNamespaces(clusterId: string | null) {
  const isConnected = useClusterConnected(clusterId)

  return useQuery({
    queryKey: ['namespaces', clusterId],
    queryFn: () => fetchNamespaces(clusterId as string),
    enabled: isConnected && !!clusterId
  })
}
