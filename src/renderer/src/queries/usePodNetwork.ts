import { useQuery } from '@tanstack/react-query'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function usePodNetwork(clusterId: string, namespace: string, podName: string, isActiveTab: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['pod-network', clusterId, namespace, podName],
    queryFn: () => window.api.pod.getNetwork({ clusterId, namespace, podName }),
    enabled: !!clusterId && !!namespace && !!podName,
    refetchInterval
  })
}
