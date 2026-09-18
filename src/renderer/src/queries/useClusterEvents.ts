import { useQuery } from '@tanstack/react-query'
import type { ClusterEventsRequest } from '@shared/types/resourceEvents'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useClusterEvents(
  clusterId: string,
  options: Omit<ClusterEventsRequest, 'clusterId'>,
  isActive: boolean,
  extras?: { minInterval?: number }
) {
  const live = useLiveRefetchInterval(isActive)
  const refetchInterval =
    live && extras?.minInterval ? Math.max(live, extras.minInterval) : live

  return useQuery({
    queryKey: [
      'cluster-events',
      clusterId,
      options.limit ?? null,
      options.involvedObjectKind ?? null,
      options.involvedObjectName ?? null,
      options.namespace ?? null,
      options.namespaces?.join(',') ?? null
    ],
    queryFn: () => window.api.resource.listClusterEvents({ clusterId, ...options }),
    enabled: !!clusterId && isActive,
    refetchInterval,
    retry: false
  })
}
