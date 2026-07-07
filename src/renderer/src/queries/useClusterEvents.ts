import { useQuery } from '@tanstack/react-query'
import type { ClusterEventsRequest } from '@shared/types/resourceEvents'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useClusterEvents(clusterId: string, options: Omit<ClusterEventsRequest, 'clusterId'>, isActive: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActive)

  return useQuery({
    queryKey: [
      'cluster-events',
      clusterId,
      options.limit ?? null,
      options.involvedObjectKind ?? null,
      options.involvedObjectName ?? null
    ],
    queryFn: () => window.api.resource.listClusterEvents({ clusterId, ...options }),
    enabled: !!clusterId && isActive,
    refetchInterval
  })
}
