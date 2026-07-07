import { useQuery } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'
import { useClusterConnected } from './useClusterConnected'
import { useBuiltinResourceWatch } from './useResourceWatch'

const POLLING_FALLBACK_STATUSES: ResourceWatchStatus[] = ['fallback-polling', 'error', 'disconnected']

export function useResourceList(
  clusterId: string | null,
  namespace: string,
  kind: ResourceKind | null,
  isActiveTab: boolean
) {
  const isConnected = useClusterConnected(clusterId)
  const watchStatus = useBuiltinResourceWatch(clusterId, namespace, kind, isActiveTab && isConnected && !!kind)

  // The Watch API is the primary update mechanism; polling only runs while watch isn't live
  // (connecting/reconnecting still get one fallback poll tick, and permanent fallback/error/disconnected
  // keep polling as the sole update source).
  const wantsPolling = POLLING_FALLBACK_STATUSES.includes(watchStatus) || watchStatus === 'reconnecting'
  const liveRefetchInterval = useLiveRefetchInterval(isActiveTab)
  const refetchInterval = wantsPolling ? liveRefetchInterval : false

  const query = useQuery({
    queryKey: ['resource-list', clusterId, namespace, kind],
    queryFn: () =>
      window.api.resource.list({ clusterId: clusterId as string, namespace, kind: kind as ResourceKind }),
    enabled: isConnected && !!clusterId && !!kind,
    refetchInterval
  })

  return { ...query, watchStatus }
}
