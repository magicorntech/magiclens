import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ALL_NAMESPACES, listNamespaceParam } from '@shared/namespaceSelection'
import type { NamespacePodMetricsResponse } from '@shared/types/pod'
import { useLiveRefreshStore } from '../stores/liveRefreshStore'
import { useIsWindowFocused } from '../stores/useIsWindowFocused'
import { useClusterConnected } from './useClusterConnected'

export type PodUsageMetric = { cpu: number; memory: number }

/** Key: `${namespace}/${podName}` */
export function podMetricsKey(namespace: string, podName: string): string {
  return `${namespace}/${podName}`
}

/**
 * Live CPU/memory for pods in the resource table.
 * One batched request (single namespace or 'ALL') so every row's usage
 * arrives at the same time instead of trickling in per namespace.
 */
export function usePodTableMetrics(
  clusterId: string | null,
  namespaceSelection: string,
  isActiveTab: boolean
): Map<string, PodUsageMetric> {
  const isConnected = useClusterConnected(clusterId)
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()
  // Usage should feel live: follow the global interval, but cap at 5s and keep
  // polling even in manual mode. Respect pause and stop when unfocused/inactive.
  const shouldPoll = isActiveTab && isConnected && windowFocused && !paused
  const refetchInterval = shouldPoll
    ? interval === 'manual'
      ? 5000
      : Math.min(interval, 5000)
    : false

  const namespace = useMemo(() => {
    const param = listNamespaceParam(namespaceSelection)
    return param && param !== ALL_NAMESPACES ? param : ALL_NAMESPACES
  }, [namespaceSelection])

  const query = useQuery({
    queryKey: ['namespace-pod-metrics', clusterId, namespace],
    queryFn: (): Promise<NamespacePodMetricsResponse> =>
      window.api.pod.getNamespaceMetrics({ clusterId: clusterId as string, namespace }),
    enabled: isConnected && !!clusterId && isActiveTab,
    refetchInterval,
    placeholderData: keepPreviousData
  })

  return useMemo(() => {
    const map = new Map<string, PodUsageMetric>()
    const data = query.data
    if (!data?.metricsAvailable) return map
    for (const pod of data.pods) {
      const ns = pod.namespace || (namespace !== ALL_NAMESPACES ? namespace : '')
      if (!pod.podName || !ns) continue
      map.set(podMetricsKey(ns, pod.podName), {
        cpu: pod.cpuUsageCores,
        memory: pod.memoryUsageBytes
      })
    }
    return map
  }, [query.data, namespace])
}
