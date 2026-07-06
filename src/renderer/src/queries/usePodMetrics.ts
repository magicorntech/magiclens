import { useQuery } from '@tanstack/react-query'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function usePodMetrics(clusterId: string, namespace: string, podName: string, isActiveTab: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['pod-metrics', clusterId, namespace, podName],
    queryFn: () => window.api.pod.getMetrics({ clusterId, namespace, podName }),
    enabled: !!clusterId && !!namespace && !!podName,
    refetchInterval
  })
}
