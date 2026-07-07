import { useQuery } from '@tanstack/react-query'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useResourceEvents(
  clusterId: string,
  namespace: string,
  name: string,
  target: ResourceMutationTarget,
  isActive: boolean
) {
  const refetchInterval = useLiveRefetchInterval(isActive)

  return useQuery({
    queryKey: ['resource-events', clusterId, namespace, name, target],
    queryFn: () => window.api.resource.listEvents({ clusterId, namespace, name, target }),
    enabled: !!clusterId && !!name,
    refetchInterval
  })
}
