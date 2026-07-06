import type { ClusterMetricsSummary, NodeMetricEntry, NodeMetricsResponse } from '@shared/types/metrics'
import type { ClusterClients } from './clusterManager'
import { parseCpuQuantity, parseMemoryQuantity } from './quantity'

function isNodeReady(node: { status?: { conditions?: { type?: string; status?: string }[] } }): boolean {
  return node.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True'
}

export async function getClusterMetricsSummary(clients: ClusterClients): Promise<ClusterMetricsSummary> {
  const [nodesRes, podsRes] = await Promise.all([clients.core.listNode(), clients.core.listPodForAllNamespaces()])

  let cpuUsageCores: number | undefined
  let memoryUsageBytes: number | undefined
  let metricsAvailable = true
  try {
    const nodeMetrics = await clients.metrics.getNodeMetrics()
    cpuUsageCores = nodeMetrics.items.reduce((sum, item) => sum + parseCpuQuantity(item.usage.cpu), 0)
    memoryUsageBytes = nodeMetrics.items.reduce((sum, item) => sum + parseMemoryQuantity(item.usage.memory), 0)
  } catch {
    metricsAvailable = false
  }

  let cpuCapacityCores = 0
  let memoryCapacityBytes = 0
  let cpuAllocatableCores = 0
  let memoryAllocatableBytes = 0
  let readyNodes = 0
  let podCapacity = 0

  for (const node of nodesRes.items) {
    cpuCapacityCores += parseCpuQuantity(node.status?.capacity?.cpu)
    memoryCapacityBytes += parseMemoryQuantity(node.status?.capacity?.memory)
    cpuAllocatableCores += parseCpuQuantity(node.status?.allocatable?.cpu)
    memoryAllocatableBytes += parseMemoryQuantity(node.status?.allocatable?.memory)
    podCapacity += parseInt(node.status?.capacity?.pods ?? '0', 10) || 0
    if (isNodeReady(node)) readyNodes++
  }

  let runningPods = 0
  let pendingPods = 0
  let failedPods = 0
  for (const pod of podsRes.items) {
    const phase = pod.status?.phase
    if (phase === 'Running') runningPods++
    else if (phase === 'Pending') pendingPods++
    else if (phase === 'Failed') failedPods++
  }

  return {
    metricsAvailable,
    totalNodes: nodesRes.items.length,
    readyNodes,
    notReadyNodes: nodesRes.items.length - readyNodes,
    cpuCapacityCores,
    memoryCapacityBytes,
    cpuAllocatableCores,
    memoryAllocatableBytes,
    cpuUsageCores,
    memoryUsageBytes,
    podCapacity,
    runningPods,
    pendingPods,
    failedPods
  }
}

export async function getNodeMetricsTable(clients: ClusterClients): Promise<NodeMetricsResponse> {
  const nodesRes = await clients.core.listNode()

  let usageByName = new Map<string, { cpu: number; memory: number }>()
  let metricsAvailable = true
  try {
    const nodeMetrics = await clients.metrics.getNodeMetrics()
    usageByName = new Map(
      nodeMetrics.items.map((item) => [
        item.metadata.name,
        { cpu: parseCpuQuantity(item.usage.cpu), memory: parseMemoryQuantity(item.usage.memory) }
      ])
    )
  } catch {
    metricsAvailable = false
  }

  const nodes: NodeMetricEntry[] = nodesRes.items.map((node) => {
    const name = node.metadata?.name ?? ''
    const usage = usageByName.get(name)
    return {
      name,
      cpuCapacityCores: parseCpuQuantity(node.status?.capacity?.cpu),
      memoryCapacityBytes: parseMemoryQuantity(node.status?.capacity?.memory),
      cpuUsageCores: usage?.cpu,
      memoryUsageBytes: usage?.memory
    }
  })

  return { metricsAvailable, nodes }
}
