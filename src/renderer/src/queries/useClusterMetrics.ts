import { useQuery } from '@tanstack/react-query'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useClusterMetrics(clusterId: string | null, isActiveTab: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['cluster-metrics-summary', clusterId],
    queryFn: () => window.api.metrics.getClusterSummary({ clusterId: clusterId as string }),
    enabled: !!clusterId,
    refetchInterval
  })
}
