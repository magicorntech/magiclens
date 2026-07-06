import { useQuery } from '@tanstack/react-query'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useNodeMetrics(clusterId: string | null, isActiveTab: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['node-metrics', clusterId],
    queryFn: () => window.api.metrics.getNodeMetrics({ clusterId: clusterId as string }),
    enabled: !!clusterId,
    refetchInterval
  })
}
