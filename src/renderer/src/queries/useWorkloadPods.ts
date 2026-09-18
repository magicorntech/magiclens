import { useQuery } from '@tanstack/react-query'
import type { WorkloadKind } from '@shared/types/workload'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useWorkloadPods(
  clusterId: string,
  kind: WorkloadKind,
  namespace: string,
  name: string,
  isActive: boolean
) {
  const refetchInterval = useLiveRefetchInterval(isActive)

  return useQuery({
    queryKey: ['workload-pods', clusterId, kind, namespace, name],
    queryFn: async () => {
      const getPods = window.api.workload.getPods
      if (typeof getPods !== 'function') {
        throw new Error('Pod list is unavailable. Restart MagicLens to load the latest backend.')
      }
      return getPods({ clusterId, kind, namespace, name })
    },
    enabled: !!clusterId && !!namespace && !!name,
    refetchInterval
  })
}
