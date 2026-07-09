import type { ClusterMetricsSummary } from '@shared/types/metrics'
import type { NodeMetricEntry } from '@shared/types/metrics'
import type { ResourceListItem } from '@shared/types/resource'
import { nodeResourcePercent } from '../../format'

export interface NodePodStats {
  podCount: number
  restartCount: number
}

export interface NodeInsight {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
  /** Navigate to this node when the insight is clicked. */
  targetNode?: string
}

export interface TopConsumerEntry {
  name: string
  value: string
  percent?: number
  /** Node to open on click (same as name for node metrics). */
  targetNode?: string
}

export function aggregatePodStatsByNode(pods: ResourceListItem[]): Map<string, NodePodStats> {
  const map = new Map<string, NodePodStats>()
  for (const pod of pods) {
    const node = pod.columns.node
    if (!node || node === '-') continue
    const existing = map.get(node) ?? { podCount: 0, restartCount: 0 }
    existing.podCount += 1
    existing.restartCount += parseInt(pod.columns.restarts ?? '0', 10) || 0
    map.set(node, existing)
  }
  return map
}

export function clusterHealthStatus(data: ClusterMetricsSummary): {
  label: string
  tone: 'success' | 'warning' | 'danger'
  message: string
} {
  if (data.notReadyNodes > 0 || data.failedPods > 0) {
    return {
      label: 'Degraded',
      tone: 'danger',
      message: `${data.notReadyNodes} not ready · ${data.failedPods} failed pods`
    }
  }
  if (data.pendingPods > 0) {
    return {
      label: 'Warning',
      tone: 'warning',
      message: `${data.pendingPods} pending pods`
    }
  }
  return {
    label: 'Healthy',
    tone: 'success',
    message: 'No critical alerts'
  }
}

export function topCpuNodes(nodes: NodeMetricEntry[], limit = 3): TopConsumerEntry[] {
  return [...nodes]
    .filter((n) => n.cpuUsageCores !== undefined)
    .sort((a, b) => (b.cpuUsageCores ?? 0) - (a.cpuUsageCores ?? 0))
    .slice(0, limit)
    .map((n) => ({
      name: n.name,
      value: `${(n.cpuUsageCores ?? 0).toFixed(1)} cores`,
      percent: nodeResourcePercent(n.cpuUsageCores, n.cpuAllocatableCores, n.cpuCapacityCores),
      targetNode: n.name
    }))
}

export function topMemoryNodes(nodes: NodeMetricEntry[], limit = 3): TopConsumerEntry[] {
  return [...nodes]
    .filter((n) => n.memoryUsageBytes !== undefined)
    .sort((a, b) => (b.memoryUsageBytes ?? 0) - (a.memoryUsageBytes ?? 0))
    .slice(0, limit)
    .map((n) => ({
      name: n.name,
      value: formatGiB(n.memoryUsageBytes ?? 0),
      percent: nodeResourcePercent(n.memoryUsageBytes, n.memoryAllocatableBytes, n.memoryCapacityBytes),
      targetNode: n.name
    }))
}

export function topPodNodes(
  podStats: Map<string, NodePodStats>,
  limit = 3
): TopConsumerEntry[] {
  return [...podStats.entries()]
    .sort((a, b) => b[1].podCount - a[1].podCount)
    .slice(0, limit)
    .map(([name, stats]) => ({ name, value: `${stats.podCount} pods`, targetNode: name }))
}

export function topRestartNodes(
  podStats: Map<string, NodePodStats>,
  limit = 3
): TopConsumerEntry[] {
  return [...podStats.entries()]
    .filter(([, s]) => s.restartCount > 0)
    .sort((a, b) => b[1].restartCount - a[1].restartCount)
    .slice(0, limit)
    .map(([name, stats]) => ({ name, value: `${stats.restartCount} restarts`, targetNode: name }))
}

export function buildQuickInsights(
  nodes: ResourceListItem[],
  nodeMetrics: NodeMetricEntry[],
  podStats: Map<string, NodePodStats>
): NodeInsight[] {
  const insights: NodeInsight[] = []

  const cpuSorted = topCpuNodes(nodeMetrics, 1)[0]
  if (cpuSorted) {
    insights.push({
      label: 'Highest CPU',
      value: cpuSorted.name,
      detail: cpuSorted.value,
      tone: (cpuSorted.percent ?? 0) >= 75 ? 'warning' : 'default',
      targetNode: cpuSorted.name
    })
  }

  const memSorted = topMemoryNodes(nodeMetrics, 1)[0]
  if (memSorted) {
    insights.push({
      label: 'Highest Memory',
      value: memSorted.name,
      detail: memSorted.value,
      tone: (memSorted.percent ?? 0) >= 75 ? 'warning' : 'default',
      targetNode: memSorted.name
    })
  }

  const byAge = [...nodes].filter((n) => n.ageTimestamp)
  if (byAge.length > 0) {
    const newest = byAge.reduce((a, b) =>
      new Date(a.ageTimestamp!).getTime() < new Date(b.ageTimestamp!).getTime() ? a : b
    )
    const oldest = byAge.reduce((a, b) =>
      new Date(a.ageTimestamp!).getTime() > new Date(b.ageTimestamp!).getTime() ? a : b
    )
    insights.push({ label: 'Newest Node', value: newest.name, targetNode: newest.name })
    insights.push({ label: 'Oldest Node', value: oldest.name, targetNode: oldest.name })
  }

  const notReady = nodes.filter((n) => n.statusText !== 'Ready')
  insights.push({
    label: 'Not Ready',
    value: String(notReady.length),
    detail: notReady.length > 0 ? notReady.map((n) => n.name).join(', ') : 'All nodes ready',
    tone: notReady.length > 0 ? 'danger' : 'success',
    targetNode: notReady.length > 0 ? notReady[0].name : undefined
  })

  const highRestarts = topRestartNodes(podStats, 1)[0]
  insights.push({
    label: 'Restarts',
    value: highRestarts?.name ?? 'None',
    detail: highRestarts?.value ?? 'No restart pressure',
    tone: highRestarts ? 'warning' : 'success',
    targetNode: highRestarts?.targetNode
  })

  return insights
}

function formatGiB(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`
}
