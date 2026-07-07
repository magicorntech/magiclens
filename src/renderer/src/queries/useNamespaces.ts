import { useQuery } from '@tanstack/react-query'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import { useClusterConnected } from './useClusterConnected'

export function useNamespaces(clusterId: string | null) {
  const isConnected = useClusterConnected(clusterId)

  return useQuery({
    queryKey: ['namespaces', clusterId],
    queryFn: async () => {
      const res = await window.api.cluster.listNamespaces({ clusterId: clusterId as string })
      if ('error' in res && res.error === CLUSTER_NOT_CONNECTED) throw new Error(CLUSTER_NOT_CONNECTED)
      return res
    },
    enabled: isConnected && !!clusterId
  })
}
