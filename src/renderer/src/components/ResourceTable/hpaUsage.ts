import type { ResourceListItem } from '@shared/types/resource'
import { podMetricsKey } from '../../queries/usePodTableMetrics'

export interface HpaTargetUsage {
  cpuUsage: number
  memoryUsage: number
  cpuRequest: number
  memoryRequest: number
  hasUsage: boolean
}

function requestNumber(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Pods that belong to an HPA scale target.
 * Callers must pass pods and replica sets from that HPA's namespace.
 * A Deployment is reached through its ReplicaSets; pods are never matched by name prefix.
 */
function podsForHpaTarget(
  target: string,
  pods: ResourceListItem[],
  replicaSets: ResourceListItem[]
): ResourceListItem[] {
  if (!target || !target.includes('/')) return []

  if (target.startsWith('Deployment/')) {
    const replicaSetOwners = new Set(
      replicaSets
        .filter((replicaSet) => replicaSet.columns.controlledBy === target)
        .map((replicaSet) => `${replicaSet.namespace}\0ReplicaSet/${replicaSet.name}`)
    )
    return pods.filter((pod) => replicaSetOwners.has(`${pod.namespace}\0${pod.columns.controlledBy}`))
  }

  if (target.startsWith('StatefulSet/') || target.startsWith('ReplicaSet/')) {
    return pods.filter((pod) => pod.columns.controlledBy === target)
  }

  return []
}

export function hpaTargetUsage(
  target: string,
  pods: ResourceListItem[],
  replicaSets: ResourceListItem[],
  metrics: Map<string, { cpu: number; memory: number }>
): HpaTargetUsage {
  const matched = podsForHpaTarget(target, pods, replicaSets)
  let cpuUsage = 0
  let memoryUsage = 0
  let cpuRequest = 0
  let memoryRequest = 0
  let hasUsage = false

  for (const pod of matched) {
    cpuRequest += requestNumber(pod.columns.cpuRequest)
    memoryRequest += requestNumber(pod.columns.memoryRequest)
    const metric = metrics.get(podMetricsKey(pod.namespace, pod.name))
    if (!metric) continue
    hasUsage = true
    cpuUsage += metric.cpu
    memoryUsage += metric.memory
  }

  return { cpuUsage, memoryUsage, cpuRequest, memoryRequest, hasUsage }
}
