import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'
import { isNamespaceScoped } from '@shared/resourceKinds'
import type { ResourceListResponse } from '@shared/types/resource'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'
import {
  filterItemsByNamespaceSelection,
  isNoNamespaceSelection,
  listNamespaceParam
} from '@shared/namespaceSelection'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'
import { useClusterConnected } from './useClusterConnected'
import { useBuiltinResourceWatch } from './useResourceWatch'

const POLLING_FALLBACK_STATUSES: ResourceWatchStatus[] = ['fallback-polling', 'error', 'disconnected']

export function useResourceList(
  clusterId: string | null,
  namespaceSelection: string,
  kind: ResourceKind | null,
  isActiveTab: boolean
) {
  const isConnected = useClusterConnected(clusterId)
  const kindNeedsNamespace = !!kind && isNamespaceScoped(kind)
  const noNamespace = isNoNamespaceSelection(namespaceSelection)
  const apiNamespace = kindNeedsNamespace ? listNamespaceParam(namespaceSelection) : 'ALL'
  const canFetch = !!kind && (!kindNeedsNamespace || (!noNamespace && apiNamespace !== null))

  const watchStatus = useBuiltinResourceWatch(
    clusterId,
    namespaceSelection,
    kind,
    isActiveTab && isConnected && canFetch
  )

  const wantsPolling = POLLING_FALLBACK_STATUSES.includes(watchStatus) || watchStatus === 'reconnecting'
  const liveRefetchInterval = useLiveRefetchInterval(isActiveTab)
  const refetchInterval = wantsPolling ? liveRefetchInterval : false

  const query = useQuery({
    queryKey: ['resource-list', clusterId, namespaceSelection, kind],
    queryFn: () =>
      window.api.resource.list({
        clusterId: clusterId as string,
        namespace: (apiNamespace ?? 'ALL') as string,
        kind: kind as ResourceKind
      }),
    enabled: isConnected && !!clusterId && canFetch,
    refetchInterval
  })

  const data = useMemo((): ResourceListResponse | undefined => {
    if (kindNeedsNamespace && noNamespace) return { items: [] }
    if (!query.data) return undefined
    if ('error' in query.data) return query.data
    return {
      items: filterItemsByNamespaceSelection(query.data.items, namespaceSelection)
    }
  }, [query.data, namespaceSelection, kindNeedsNamespace, noNamespace])

  return { ...query, data, watchStatus }
}
