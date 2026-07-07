import { useQuery } from '@tanstack/react-query'
import type { MetricsTimeRange } from '@shared/metricsTimeRange'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useLiveRefetchInterval } from '../stores/useLiveRefetchInterval'

export function useNodeMetricsRange(
  clusterId: string | null,
  nodeName: string | null,
  range: MetricsTimeRange,
  isActive: boolean
) {
  const refetchInterval = useLiveRefetchInterval(isActive)
  return useQuery({
    queryKey: ['metrics-node-range', clusterId, nodeName, JSON.stringify(range)],
    queryFn: () =>
      window.api.metrics.getNodeRange({ clusterId: clusterId as string, nodeName: nodeName as string, range }),
    enabled: !!clusterId && !!nodeName && isActive,
    refetchInterval
  })
}

export function usePodMetricsRange(
  clusterId: string | null,
  namespace: string | null,
  podName: string | null,
  range: MetricsTimeRange,
  isActive: boolean
) {
  const refetchInterval = useLiveRefetchInterval(isActive)
  return useQuery({
    queryKey: ['metrics-pod-range', clusterId, namespace, podName, JSON.stringify(range)],
    queryFn: () =>
      window.api.metrics.getPodRange({
        clusterId: clusterId as string,
        namespace: namespace as string,
        podName: podName as string,
        range
      }),
    enabled: !!clusterId && !!namespace && !!podName && isActive,
    refetchInterval
  })
}

export function useClusterMetricsRange(clusterId: string | null, range: MetricsTimeRange, isActive: boolean) {
  const refetchInterval = useLiveRefetchInterval(isActive)
  return useQuery({
    queryKey: ['metrics-cluster-range', clusterId, JSON.stringify(range)],
    queryFn: () => window.api.metrics.getClusterRange({ clusterId: clusterId as string, range }),
    enabled: !!clusterId && isActive,
    refetchInterval
  })
}

export function useHpaMetricsRange(
  clusterId: string | null,
  namespace: string | null,
  hpaName: string | null,
  range: MetricsTimeRange,
  isActive: boolean
) {
  return useQuery({
    queryKey: ['metrics-hpa-range', clusterId, namespace, hpaName, JSON.stringify(range)],
    queryFn: () =>
      window.api.metrics.getHpaRange({
        clusterId: clusterId as string,
        namespace: namespace as string,
        hpaName: hpaName as string,
        range
      }),
    enabled: !!clusterId && !!namespace && !!hpaName && isActive
  })
}

export function useDeploymentMetricsRange(
  clusterId: string | null,
  namespace: string | null,
  deploymentName: string | null,
  range: MetricsTimeRange,
  isActive: boolean
) {
  return useQuery({
    queryKey: ['metrics-deployment-range', clusterId, namespace, deploymentName, JSON.stringify(range)],
    queryFn: () =>
      window.api.metrics.getDeploymentRange({
        clusterId: clusterId as string,
        namespace: namespace as string,
        deploymentName: deploymentName as string,
        range
      }),
    enabled: !!clusterId && !!namespace && !!deploymentName && isActive
  })
}

export function useNodePressureMetrics(
  clusterId: string | null,
  nodeName: string | null,
  range: MetricsTimeRange,
  isActive: boolean
) {
  return useQuery({
    queryKey: ['metrics-node-pressure', clusterId, nodeName, JSON.stringify(range)],
    queryFn: () =>
      window.api.metrics.getNodePressure({
        clusterId: clusterId as string,
        nodeName: nodeName as string,
        range
      }),
    enabled: !!clusterId && !!nodeName && isActive
  })
}

export function useResourcePermissions(
  clusterId: string,
  target: ResourceMutationTarget,
  namespace: string,
  name: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['resource-permissions', clusterId, target, namespace, name],
    queryFn: () => window.api.rbac.getResourcePermissions({ clusterId, target, namespace, name }),
    enabled,
    staleTime: 60_000
  })
}
