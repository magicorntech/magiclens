import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ALL_NAMESPACES, listNamespaceParam } from '@shared/namespaceSelection'
import type { PvcUsageEntry } from '@shared/types/metrics'
import { useLiveRefreshStore } from '../stores/liveRefreshStore'
import { useIsWindowFocused } from '../stores/useIsWindowFocused'
import { useClusterConnected } from './useClusterConnected'

export function pvcMetricsKey(namespace: string, pvcName: string): string {
  return `${namespace}/${pvcName}`
}

/**
 * Live kubelet volume stats for PVC rows (used / capacity / % full).
 * Needs Prometheus with kubelet_volume_stats_*.
 */
export function usePvcTableMetrics(
  clusterId: string | null,
  namespaceSelection: string,
  isActiveTab: boolean
): Map<string, PvcUsageEntry> {
  const isConnected = useClusterConnected(clusterId)
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()
  const shouldPoll = isActiveTab && isConnected && windowFocused && !paused
  const refetchInterval = shouldPoll
    ? interval === 'manual'
      ? 15000
      : Math.max(interval, 10000)
    : false

  const namespace = useMemo(() => {
    const param = listNamespaceParam(namespaceSelection)
    return param && param !== ALL_NAMESPACES ? param : ALL_NAMESPACES
  }, [namespaceSelection])

  const query = useQuery({
    queryKey: ['pvc-usage', clusterId, namespace],
    queryFn: () =>
      window.api.metrics.getPvcUsage({ clusterId: clusterId as string, namespace }),
    enabled: isConnected && !!clusterId && isActiveTab,
    refetchInterval,
    placeholderData: keepPreviousData
  })

  return useMemo(() => {
    const map = new Map<string, PvcUsageEntry>()
    const data = query.data
    if (!data?.metricsAvailable) return map
    for (const item of data.items) {
      if (!item.name || !item.namespace) continue
      map.set(pvcMetricsKey(item.namespace, item.name), item)
    }
    return map
  }, [query.data])
}
