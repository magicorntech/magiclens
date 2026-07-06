import { useQuery } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useResourceList(
  clusterId: string | null,
  namespace: string,
  kind: ResourceKind | null,
  isActiveTab: boolean
) {
  const refetchInterval = useLiveRefetchInterval(isActiveTab)

  return useQuery({
    queryKey: ['resource-list', clusterId, namespace, kind],
    queryFn: () =>
      window.api.resource.list({ clusterId: clusterId as string, namespace, kind: kind as ResourceKind }),
    enabled: !!clusterId && !!kind,
    refetchInterval
  })
}
