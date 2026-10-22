import { useMemo } from 'react'
import type { ResourceListItem, ResourceListResponse } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { usePodTableMetrics, type PodUsageMetric } from '../../queries/usePodTableMetrics'

const NO_ROWS: ResourceListItem[] = []

function listItems(data: ResourceListResponse | undefined): ResourceListItem[] {
  if (!data || !('items' in data)) return NO_ROWS
  return data.items
}

/**
 * One Pod list, one ReplicaSet list, and one namespace pod-metrics query
 * for the whole HPA table. Pass a null clusterId when the table is not HPA.
 */
export function useHpaTargetUsage(
  clusterId: string | null,
  namespace: string,
  isActive: boolean
): {
  pods: ResourceListItem[]
  replicaSets: ResourceListItem[]
  metrics: Map<string, PodUsageMetric>
} {
  const activeClusterId = isActive ? clusterId : null
  const podsQuery = useResourceList(activeClusterId, namespace, activeClusterId ? 'Pods' : null, isActive)
  const replicaSetsQuery = useResourceList(
    activeClusterId,
    namespace,
    activeClusterId ? 'ReplicaSets' : null,
    isActive
  )
  const metrics = usePodTableMetrics(activeClusterId, namespace, isActive && !!activeClusterId)
  const pods = useMemo(() => listItems(podsQuery.data), [podsQuery.data])
  const replicaSets = useMemo(() => listItems(replicaSetsQuery.data), [replicaSetsQuery.data])
  return useMemo(() => ({ pods, replicaSets, metrics }), [pods, replicaSets, metrics])
}
