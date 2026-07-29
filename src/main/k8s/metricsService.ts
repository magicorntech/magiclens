import type { ClusterMetricsSummary, NodeMetricEntry, NodeMetricsResponse } from '@shared/types/metrics'
import type { PrometheusQueryData } from '@shared/types/prometheus'
import type { ClusterClients } from './clusterManager'
import { parseCpuQuantity, parseMemoryQuantity } from './quantity'
import { ensurePrometheusDiscovered, prometheusQuery } from './prometheusService'

function isNodeReady(node: { status?: { conditions?: { type?: string; status?: string }[] } }): boolean {
  return node.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True'
}

function scalarFromVector(data?: PrometheusQueryData): number | undefined {
  if (!data || data.resultType !== 'vector' || data.result.length === 0) return undefined
  const sample = data.result[0]?.value
  if (!sample) return undefined
  const n = Number.parseFloat(sample[1])
  return Number.isFinite(n) ? n : undefined
}

function mapFromVector(data: PrometheusQueryData | undefined, labelKey: string): Map<string, number> {
  const map = new Map<string, number>()
  if (!data || data.resultType !== 'vector') return map
  for (const series of data.result) {
    const key = series.metric[labelKey]
    const sample = series.value
    if (!key || !sample) continue
    const n = Number.parseFloat(sample[1])
    if (Number.isFinite(n)) map.set(key, n)
  }
  return map
}

/** Instant cluster usage via cAdvisor/kubelet metrics scraped by Prometheus. */
async function clusterUsageFromPrometheus(
  clusterId: string
): Promise<{ cpuUsageCores?: number; memoryUsageBytes?: number } | null> {
  const status = await ensurePrometheusDiscovered(clusterId)
  if (!status.available) return null

  const [cpuRes, memRes] = await Promise.all([
    prometheusQuery({
      clusterId,
      query: 'sum(rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[2m]))'
    }),
    prometheusQuery({
      clusterId,
      query: 'sum(container_memory_working_set_bytes{container!="",container!="POD"})'
    })
  ])

  const cpuUsageCores = scalarFromVector(cpuRes.data)
  const memoryUsageBytes = scalarFromVector(memRes.data)
  if (cpuUsageCores === undefined && memoryUsageBytes === undefined) return null
  return { cpuUsageCores, memoryUsageBytes }
}

/** Per-node instant usage via Prometheus. */
async function nodeUsageFromPrometheus(clusterId: string): Promise<Map<string, { cpu: number; memory: number }> | null> {
  const status = await ensurePrometheusDiscovered(clusterId)
  if (!status.available) return null

  const [cpuRes, memRes] = await Promise.all([
    prometheusQuery({
      clusterId,
      query: 'sum by (node) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[2m]))'
    }),
    prometheusQuery({
      clusterId,
      query: 'sum by (node) (container_memory_working_set_bytes{container!="",container!="POD"})'
    })
  ])

  const cpuByNode = mapFromVector(cpuRes.data, 'node')
  const memByNode = mapFromVector(memRes.data, 'node')
  if (cpuByNode.size === 0 && memByNode.size === 0) return null

  const names = new Set([...cpuByNode.keys(), ...memByNode.keys()])
  const usage = new Map<string, { cpu: number; memory: number }>()
  for (const name of names) {
    usage.set(name, {
      cpu: cpuByNode.get(name) ?? 0,
      memory: memByNode.get(name) ?? 0
    })
  }
  return usage
}

export async function getClusterMetricsSummary(
  clients: ClusterClients,
  clusterId: string
): Promise<ClusterMetricsSummary> {
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

  if (!metricsAvailable || cpuUsageCores === undefined || memoryUsageBytes === undefined) {
    const fromProm = await clusterUsageFromPrometheus(clusterId)
    if (fromProm) {
      cpuUsageCores = fromProm.cpuUsageCores ?? cpuUsageCores
      memoryUsageBytes = fromProm.memoryUsageBytes ?? memoryUsageBytes
      metricsAvailable = true
    }
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

export async function getNodeMetricsTable(
  clients: ClusterClients,
  clusterId: string
): Promise<NodeMetricsResponse> {
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

  if (!metricsAvailable || usageByName.size === 0) {
    const fromProm = await nodeUsageFromPrometheus(clusterId)
    if (fromProm && fromProm.size > 0) {
      usageByName = fromProm
      metricsAvailable = true
    }
  }

  const nodes: NodeMetricEntry[] = nodesRes.items.map((node) => {
    const name = node.metadata?.name ?? ''
    const usage = usageByName.get(name)
    return {
      name,
      cpuCapacityCores: parseCpuQuantity(node.status?.capacity?.cpu),
      memoryCapacityBytes: parseMemoryQuantity(node.status?.capacity?.memory),
      cpuAllocatableCores: parseCpuQuantity(node.status?.allocatable?.cpu),
      memoryAllocatableBytes: parseMemoryQuantity(node.status?.allocatable?.memory),
      cpuUsageCores: usage?.cpu,
      memoryUsageBytes: usage?.memory
    }
  })

  return { metricsAvailable, nodes }
}

/** Instant pod container usage via Prometheus (fallback when metrics-server is down). */
export async function podUsageFromPrometheus(
  clusterId: string,
  namespace: string,
  podName: string
): Promise<{ containers: { name: string; cpuUsageCores: number; memoryUsageBytes: number }[] } | null> {
  const status = await ensurePrometheusDiscovered(clusterId)
  if (!status.available) return null

  const ns = namespace.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const pod = podName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const base = `{namespace="${ns}",pod="${pod}",container!="",container!="POD"}`

  const [cpuRes, memRes] = await Promise.all([
    prometheusQuery({
      clusterId,
      query: `sum by (container) (rate(container_cpu_usage_seconds_total${base}[2m]))`
    }),
    prometheusQuery({
      clusterId,
      query: `sum by (container) (container_memory_working_set_bytes${base})`
    })
  ])

  const cpuByContainer = mapFromVector(cpuRes.data, 'container')
  const memByContainer = mapFromVector(memRes.data, 'container')
  if (cpuByContainer.size === 0 && memByContainer.size === 0) return null

  const names = new Set([...cpuByContainer.keys(), ...memByContainer.keys()])
  const containers = [...names].map((name) => ({
    name,
    cpuUsageCores: cpuByContainer.get(name) ?? 0,
    memoryUsageBytes: memByContainer.get(name) ?? 0
  }))
  return { containers }
}

/** Instant per-pod usage in a namespace via Prometheus. */
export async function namespacePodUsageFromPrometheus(
  clusterId: string,
  namespace: string
): Promise<{ podName: string; cpuUsageCores: number; memoryUsageBytes: number }[] | null> {
  const status = await ensurePrometheusDiscovered(clusterId)
  if (!status.available) return null

  const ns = namespace.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const base = `{namespace="${ns}",container!="",container!="POD"}`

  const [cpuRes, memRes] = await Promise.all([
    prometheusQuery({
      clusterId,
      query: `sum by (pod) (rate(container_cpu_usage_seconds_total${base}[2m]))`
    }),
    prometheusQuery({
      clusterId,
      query: `sum by (pod) (container_memory_working_set_bytes${base})`
    })
  ])

  const cpuByPod = mapFromVector(cpuRes.data, 'pod')
  const memByPod = mapFromVector(memRes.data, 'pod')
  if (cpuByPod.size === 0 && memByPod.size === 0) return null

  const names = new Set([...cpuByPod.keys(), ...memByPod.keys()])
  return [...names].map((podName) => ({
    podName,
    cpuUsageCores: cpuByPod.get(podName) ?? 0,
    memoryUsageBytes: memByPod.get(podName) ?? 0
  }))
}
