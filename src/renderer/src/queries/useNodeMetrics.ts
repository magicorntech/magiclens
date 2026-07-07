import { useQuery } from '@tanstack/react-query'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'
import { useClusterConnected } from './useClusterConnected'

export function useNodeMetrics(clusterId: string | null, isActiveTab: boolean) {
  const isConnected = useClusterConnected(clusterId)
  const refetchInterval = useLiveRefetchInterval(isActiveTab && isConnected)

  return useQuery({
    queryKey: ['node-metrics', clusterId],
    queryFn: async () => {
      const res = await window.api.metrics.getNodeMetrics({ clusterId: clusterId as string })
      if ('error' in res && res.error === CLUSTER_NOT_CONNECTED) throw new Error(CLUSTER_NOT_CONNECTED)
      return res
    },
    enabled: isConnected && !!clusterId,
    refetchInterval
  })
}
