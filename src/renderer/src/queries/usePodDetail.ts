import { useQuery } from '@tanstack/react-query'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function usePodDetail(clusterId: string, namespace: string, podName: string, isActiveTab: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['pod-detail', clusterId, namespace, podName],
    queryFn: () => window.api.pod.getDetail({ clusterId, namespace, podName }),
    enabled: !!clusterId && !!namespace && !!podName,
    refetchInterval
  })
}
