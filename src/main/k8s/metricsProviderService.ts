import type { PrometheusMetricSeries, PrometheusQueryData } from '@shared/types/prometheus'
import { ALL_NAMESPACES } from '@shared/namespaceSelection'
import type {
  ClusterMetricsRangeRequest,
  DeploymentMetricsRangeRequest,
  HpaMetricsRangeRequest,
  MetricsPressureEvent,
  MetricsRangeResponse,
  MetricsSeries,
  NodeMetricsRangeRequest,
  NodePressureRequest,
  PodMetricsRangeRequest,
  PvcMetricsRangeRequest,
  PvcUsageEntry,
  PvcUsageRequest,
  PvcUsageResponse
} from '@shared/types/metrics'
import type { MetricsTimeRange } from '@shared/metricsTimeRange'
import { HISTORICAL_METRICS_WARNING, rateIntervalForDuration, resolveMetricsWindow } from '@shared/metricsTimeRange'
import { ensurePrometheusDiscovered, prometheusQuery, prometheusQueryRange } from './prometheusService'

function escapePromQlLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function matrixToSeries(
  data: PrometheusQueryData,
  labelFn: (metric: Record<string, string>) => string
): MetricsSeries[] {
  if (data.resultType !== 'matrix') return []
  return data.result.map((series: PrometheusMetricSeries) => ({
    name: labelFn(series.metric),
    points: (series.values ?? []).map(([timestamp, value]) => ({
      timestamp: timestamp * 1000,
      value: Number.parseFloat(value)
    }))
  }))
}

function unavailableResponse(): MetricsRangeResponse {
  return {
    historicalAvailable: false,
    prometheusAvailable: false,
    warning: HISTORICAL_METRICS_WARNING
  }
}

function errorResponse(error: string): MetricsRangeResponse {
  return { historicalAvailable: false, prometheusAvailable: true, error }
}

function successResponse(partial: Partial<MetricsRangeResponse>): MetricsRangeResponse {
  return { historicalAvailable: true, prometheusAvailable: true, ...partial }
}

type RangePart = { series: MetricsSeries[]; error?: string; available: boolean }

function assembleHistorical(parts: {
  cpu?: RangePart
  memory?: RangePart
  networkReceive?: RangePart
  networkTransmit?: RangePart
  diskUsage?: RangePart
  restartCount?: RangePart
  replicaCount?: RangePart
  filesystemUsageBytes?: RangePart
  filesystemSizeBytes?: RangePart
  filesystemPercent?: RangePart
  volumeUsageBytes?: RangePart
  volumeCapacityBytes?: RangePart
  volumePercent?: RangePart
}): MetricsRangeResponse {
  const values = Object.values(parts)
  if (values.length === 0 || values.every((part) => !part.available)) return unavailableResponse()

  const out: Partial<MetricsRangeResponse> = {}
  for (const [key, part] of Object.entries(parts) as [keyof typeof parts, RangePart | undefined][]) {
    if (!part || !part.available || part.error) continue
    ;(out as Record<string, MetricsSeries[]>)[key] = part.series
  }

  const hasSeries = Object.values(out).some((series) => Array.isArray(series) && series.length > 0)
  if (!hasSeries && values.every((part) => part.error || part.series.length === 0)) {
    const error = values.find((part) => part.error)?.error
    if (error && values.every((part) => part.error || !part.available)) return errorResponse(error)
  }

  return successResponse(out)
}

async function queryRangeMatrix(
  clusterId: string,
  range: MetricsTimeRange,
  query: string,
  labelFn: (metric: Record<string, string>) => string = () => 'Usage'
): Promise<{ series: MetricsSeries[]; error?: string; available: boolean }> {
  const status = await ensurePrometheusDiscovered(clusterId)
  if (!status.available) return { available: false, series: [] }
  const { start, end, step } = resolveMetricsWindow(range)
  const res = await prometheusQueryRange({ clusterId, query, start, end, step })
  if (!res.available) return { available: false, series: [] }
  if (res.error) return { available: true, series: [], error: res.error }
  return { available: true, series: res.data ? matrixToSeries(res.data, labelFn) : [] }
}

export async function getNodeMetricsRange(req: NodeMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const { durationSeconds } = resolveMetricsWindow(req.range)
  const rate = rateIntervalForDuration(durationSeconds)
  const node = escapePromQlLabel(req.nodeName)
  const base = `{container!="",node="${node}"}`
  const fsFilter = 'fstype!~"tmpfs|overlay|squashfs|nsfs|aufs|iso9660"'
  const nodeInstance = `max by (instance) (node_uname_info{nodename="${node}"})`
  const mountLabel = (metric: Record<string, string>) => metric.mountpoint || metric.device || 'disk'

  const [
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    filesystemUsageBytes,
    filesystemSizeBytes,
    filesystemPercent
  ] = await Promise.all([
    queryRangeMatrix(req.clusterId, req.range, `sum(rate(container_cpu_usage_seconds_total${base}[${rate}]))`),
    queryRangeMatrix(req.clusterId, req.range, `sum(container_memory_working_set_bytes${base})`),
    queryRangeMatrix(req.clusterId, req.range, `sum(rate(container_network_receive_bytes_total${base}[${rate}]))`),
    queryRangeMatrix(req.clusterId, req.range, `sum(rate(container_network_transmit_bytes_total${base}[${rate}]))`),
    queryRangeMatrix(req.clusterId, req.range, `sum(container_fs_usage_bytes${base})`),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(kube_pod_container_status_restarts_total * on(namespace, pod) group_left(node) kube_pod_info{node="${node}"})`
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum by (mountpoint) ((node_filesystem_size_bytes{${fsFilter}} - node_filesystem_avail_bytes{${fsFilter}}) * on(instance) group_left() ${nodeInstance})`,
      mountLabel
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum by (mountpoint) (node_filesystem_size_bytes{${fsFilter}} * on(instance) group_left() ${nodeInstance})`,
      mountLabel
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum by (mountpoint) (100 * (1 - node_filesystem_avail_bytes{${fsFilter}} / node_filesystem_size_bytes{${fsFilter}}) * on(instance) group_left() ${nodeInstance})`,
      mountLabel
    )
  ])

  return assembleHistorical({
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    filesystemUsageBytes,
    filesystemSizeBytes,
    filesystemPercent
  })
}

export async function getPodMetricsRange(req: PodMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const { durationSeconds } = resolveMetricsWindow(req.range)
  const rate = rateIntervalForDuration(durationSeconds)
  const namespace = escapePromQlLabel(req.namespace)
  const pod = escapePromQlLabel(req.podName)
  const base = `{namespace="${namespace}",pod="${pod}",container!=""}`
  const byContainer = (metric: Record<string, string>) => metric.container ?? 'unknown'
  const byPvc = (metric: Record<string, string>) => metric.persistentvolumeclaim ?? metric.volume ?? 'volume'
  // Join kubelet volume stats to this pod's PVCs via kube-state-metrics
  const pvcJoin = `* on(namespace, persistentvolumeclaim) group_left() kube_pod_spec_volumes_persistentvolumeclaims_info{namespace="${namespace}",pod="${pod}"}`

  const [
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    volumeUsageBytes,
    volumeCapacityBytes,
    volumePercent
  ] = await Promise.all([
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(rate(container_cpu_usage_seconds_total${base}[${rate}])) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(container_memory_working_set_bytes${base}) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(rate(container_network_receive_bytes_total${base}[${rate}])) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(rate(container_network_transmit_bytes_total${base}[${rate}])) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(container_fs_usage_bytes${base}) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `sum(kube_pod_container_status_restarts_total{namespace="${namespace}",pod="${pod}"}) by (container)`,
      byContainer
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `kubelet_volume_stats_used_bytes{namespace="${namespace}"} ${pvcJoin}`,
      byPvc
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `kubelet_volume_stats_capacity_bytes{namespace="${namespace}"} ${pvcJoin}`,
      byPvc
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `100 * kubelet_volume_stats_used_bytes{namespace="${namespace}"} / kubelet_volume_stats_capacity_bytes{namespace="${namespace}"} ${pvcJoin}`,
      byPvc
    )
  ])

  return assembleHistorical({
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    volumeUsageBytes,
    volumeCapacityBytes,
    volumePercent
  })
}

export async function getClusterMetricsRange(req: ClusterMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const { durationSeconds } = resolveMetricsWindow(req.range)
  const rate = rateIntervalForDuration(durationSeconds)
  const [cpu, memory] = await Promise.all([
    queryRangeMatrix(req.clusterId, req.range, `sum(rate(container_cpu_usage_seconds_total{container!=""}[${rate}]))`),
    queryRangeMatrix(req.clusterId, req.range, `sum(container_memory_working_set_bytes{container!=""})`)
  ])
  return assembleHistorical({ cpu, memory })
}

export async function getHpaMetricsRange(req: HpaMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const ns = escapePromQlLabel(req.namespace)
  const name = escapePromQlLabel(req.hpaName)
  const replicaCount = await queryRangeMatrix(
    req.clusterId,
    req.range,
    `kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}",horizontalpodautoscaler="${name}"}`
  )
  if (replicaCount.error) return errorResponse(replicaCount.error)
  if (!replicaCount.available) return unavailableResponse()
  return successResponse({ replicaCount: replicaCount.series })
}

export async function getDeploymentMetricsRange(req: DeploymentMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const ns = escapePromQlLabel(req.namespace)
  const name = escapePromQlLabel(req.deploymentName)
  const replicaCount = await queryRangeMatrix(
    req.clusterId,
    req.range,
    `kube_deployment_status_replicas{namespace="${ns}",deployment="${name}"}`
  )
  if (replicaCount.error) return errorResponse(replicaCount.error)
  if (!replicaCount.available) return unavailableResponse()
  return successResponse({ replicaCount: replicaCount.series })
}

export async function getNodePressureMetrics(req: NodePressureRequest): Promise<MetricsRangeResponse> {
  const node = escapePromQlLabel(req.nodeName)
  const status = await ensurePrometheusDiscovered(req.clusterId)
  if (!status.available) return unavailableResponse()
  const { start, end, step } = resolveMetricsWindow(req.range)
  const conditions = ['MemoryPressure', 'DiskPressure', 'PIDPressure']
  const pressureEvents: MetricsPressureEvent[] = []

  for (const condition of conditions) {
    const query = `kube_node_status_condition{condition="${condition}",status="true",node="${node}"}`
    const res = await prometheusQueryRange({ clusterId: req.clusterId, query, start, end, step })
    if (res.error) continue
    for (const series of res.data?.result ?? []) {
      for (const [timestamp, value] of series.values ?? []) {
        if (value === '1') pressureEvents.push({ timestamp: timestamp * 1000, condition, value: 1 })
      }
    }
  }

  return successResponse({ pressureEvents: pressureEvents.sort((a, b) => a.timestamp - b.timestamp) })
}

function pvcNsMatcher(namespace: string): string {
  if (!namespace || namespace === ALL_NAMESPACES) return ''
  return `namespace="${escapePromQlLabel(namespace)}"`
}

function pvcSeriesName(metric: Record<string, string>): string {
  return metric.persistentvolumeclaim ?? metric.volumename ?? 'volume'
}

function ingestPvcVector(
  data: PrometheusQueryData | undefined,
  acc: Map<string, PvcUsageEntry>,
  field: 'usedBytes' | 'capacityBytes' | 'availableBytes'
): void {
  if (!data || data.resultType !== 'vector') return
  for (const series of data.result) {
    const name = series.metric.persistentvolumeclaim
    const namespace = series.metric.namespace ?? ''
    const sample = series.value
    if (!name || !sample) continue
    const n = Number.parseFloat(sample[1])
    if (!Number.isFinite(n)) continue
    const key = `${namespace}/${name}`
    const entry = acc.get(key) ?? { namespace, name }
    entry[field] = Math.max(entry[field] ?? 0, n)
    acc.set(key, entry)
  }
}

/** Instant kubelet volume stats per PVC (used / capacity / % full). */
export async function getPvcUsageTable(req: PvcUsageRequest): Promise<PvcUsageResponse> {
  const status = await ensurePrometheusDiscovered(req.clusterId)
  if (!status.available) return { metricsAvailable: false, items: [] }

  const matcher = pvcNsMatcher(req.namespace)
  const selector = matcher ? `{${matcher}}` : ''
  const by = 'max by (namespace, persistentvolumeclaim)'

  const [used, capacity, available] = await Promise.all([
    prometheusQuery({
      clusterId: req.clusterId,
      query: `${by} (kubelet_volume_stats_used_bytes${selector})`
    }),
    prometheusQuery({
      clusterId: req.clusterId,
      query: `${by} (kubelet_volume_stats_capacity_bytes${selector})`
    }),
    prometheusQuery({
      clusterId: req.clusterId,
      query: `${by} (kubelet_volume_stats_available_bytes${selector})`
    })
  ])

  if (used.error && capacity.error) return { metricsAvailable: false, items: [] }

  const acc = new Map<string, PvcUsageEntry>()
  ingestPvcVector(used.data, acc, 'usedBytes')
  ingestPvcVector(capacity.data, acc, 'capacityBytes')
  ingestPvcVector(available.data, acc, 'availableBytes')

  const items = [...acc.values()].map((entry) => {
    const percent =
      entry.usedBytes !== undefined && entry.capacityBytes && entry.capacityBytes > 0
        ? Math.min(100, Math.max(0, (entry.usedBytes / entry.capacityBytes) * 100))
        : undefined
    return { ...entry, percent }
  })

  return { metricsAvailable: items.length > 0 || !used.error, items }
}

export async function getPvcMetricsRange(req: PvcMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const namespace = escapePromQlLabel(req.namespace)
  const pvc = escapePromQlLabel(req.pvcName)
  const selector = `{namespace="${namespace}",persistentvolumeclaim="${pvc}"}`
  const byPvc = (metric: Record<string, string>) => pvcSeriesName(metric)

  const [volumeUsageBytes, volumeCapacityBytes, volumePercent] = await Promise.all([
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `max by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes${selector})`,
      byPvc
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `max by (namespace, persistentvolumeclaim) (kubelet_volume_stats_capacity_bytes${selector})`,
      byPvc
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `100 * max by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes${selector}) / max by (namespace, persistentvolumeclaim) (kubelet_volume_stats_capacity_bytes${selector})`,
      byPvc
    )
  ])

  return assembleHistorical({
    volumeUsageBytes,
    volumeCapacityBytes,
    volumePercent
  })
}
