import type { PrometheusMetricSeries, PrometheusQueryData } from '@shared/types/prometheus'
import type {
  ClusterMetricsRangeRequest,
  DeploymentMetricsRangeRequest,
  HpaMetricsRangeRequest,
  MetricsPressureEvent,
  MetricsRangeResponse,
  MetricsSeries,
  NodeMetricsRangeRequest,
  NodePressureRequest,
  PodMetricsRangeRequest
} from '@shared/types/metrics'
import type { MetricsTimeRange } from '@shared/metricsTimeRange'
import { HISTORICAL_METRICS_WARNING, rateIntervalForDuration, resolveMetricsWindow } from '@shared/metricsTimeRange'
import { getPrometheusStatus, prometheusQueryRange } from './prometheusService'

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

async function queryRangeMatrix(
  clusterId: string,
  range: MetricsTimeRange,
  query: string,
  labelFn: (metric: Record<string, string>) => string = () => 'Usage'
): Promise<{ series: MetricsSeries[]; error?: string; available: boolean }> {
  if (!getPrometheusStatus(clusterId).available) return { available: false, series: [] }
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
  // node-exporter uses instance; join via node_uname_info.nodename (standard kube-prometheus)
  const fsJoin = `* on(instance) group_left(nodename) node_uname_info{nodename="${node}"}`
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
    queryRangeMatrix(req.clusterId, req.range, `sum(kube_pod_container_status_restarts_total{node="${node}"})`),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `(node_filesystem_size_bytes{${fsFilter}} - node_filesystem_avail_bytes{${fsFilter}}) ${fsJoin}`,
      mountLabel
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `node_filesystem_size_bytes{${fsFilter}} ${fsJoin}`,
      mountLabel
    ),
    queryRangeMatrix(
      req.clusterId,
      req.range,
      `100 * (1 - node_filesystem_avail_bytes{${fsFilter}} / node_filesystem_size_bytes{${fsFilter}}) ${fsJoin}`,
      mountLabel
    )
  ])

  const error = [
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    filesystemUsageBytes,
    filesystemSizeBytes,
    filesystemPercent
  ].find((r) => r.error)?.error
  if (error) return errorResponse(error)
  if (!cpu.available) return unavailableResponse()

  return successResponse({
    cpu: cpu.series,
    memory: memory.series,
    networkReceive: networkReceive.series,
    networkTransmit: networkTransmit.series,
    diskUsage: diskUsage.series,
    restartCount: restartCount.series,
    filesystemUsageBytes: filesystemUsageBytes.series,
    filesystemSizeBytes: filesystemSizeBytes.series,
    filesystemPercent: filesystemPercent.series
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
  const pvcJoin = `* on(namespace, persistentvolumeclaim) group_left() kube_pod_spec_volumes_persistentvolumeclaims{namespace="${namespace}",pod="${pod}"}`

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

  const error = [
    cpu,
    memory,
    networkReceive,
    networkTransmit,
    diskUsage,
    restartCount,
    volumeUsageBytes,
    volumeCapacityBytes,
    volumePercent
  ].find((r) => r.error)?.error
  if (error) return errorResponse(error)
  if (!cpu.available) return unavailableResponse()

  return successResponse({
    cpu: cpu.series,
    memory: memory.series,
    networkReceive: networkReceive.series,
    networkTransmit: networkTransmit.series,
    diskUsage: diskUsage.series,
    restartCount: restartCount.series,
    volumeUsageBytes: volumeUsageBytes.series,
    volumeCapacityBytes: volumeCapacityBytes.series,
    volumePercent: volumePercent.series
  })
}

export async function getClusterMetricsRange(req: ClusterMetricsRangeRequest): Promise<MetricsRangeResponse> {
  const { durationSeconds } = resolveMetricsWindow(req.range)
  const rate = rateIntervalForDuration(durationSeconds)
  const [cpu, memory] = await Promise.all([
    queryRangeMatrix(req.clusterId, req.range, `sum(rate(container_cpu_usage_seconds_total{container!=""}[${rate}]))`),
    queryRangeMatrix(req.clusterId, req.range, `sum(container_memory_working_set_bytes{container!=""})`)
  ])
  const error = cpu.error ?? memory.error
  if (error) return errorResponse(error)
  if (!cpu.available) return unavailableResponse()
  return successResponse({ cpu: cpu.series, memory: memory.series })
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
  if (!getPrometheusStatus(req.clusterId).available) return unavailableResponse()
  const { start, end, step } = resolveMetricsWindow(req.range)
  const conditions = ['MemoryPressure', 'DiskPressure', 'PIDPressure']
  const pressureEvents: MetricsPressureEvent[] = []

  for (const condition of conditions) {
    const query = `kube_node_status_condition{condition="${condition}",status="true",node="${node}"}`
    const res = await prometheusQueryRange({ clusterId: req.clusterId, query, start, end, step })
    if (res.error) return errorResponse(res.error)
    for (const series of res.data?.result ?? []) {
      for (const [timestamp, value] of series.values ?? []) {
        if (value === '1') pressureEvents.push({ timestamp: timestamp * 1000, condition, value: 1 })
      }
    }
  }

  return successResponse({ pressureEvents: pressureEvents.sort((a, b) => a.timestamp - b.timestamp) })
}
