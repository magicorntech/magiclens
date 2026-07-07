import type { ClusterIdRequest } from './cluster'
import type { MetricsTimeRange } from '../metricsTimeRange'

export interface MetricsSeriesPoint {
  timestamp: number
  value: number
}

export interface MetricsSeries {
  name: string
  points: MetricsSeriesPoint[]
}

export interface MetricsRangeResponse {
  historicalAvailable: boolean
  prometheusAvailable: boolean
  warning?: string
  error?: string
  cpu?: MetricsSeries[]
  memory?: MetricsSeries[]
  networkReceive?: MetricsSeries[]
  networkTransmit?: MetricsSeries[]
  diskUsage?: MetricsSeries[]
  restartCount?: MetricsSeries[]
  replicaCount?: MetricsSeries[]
  pressureEvents?: MetricsPressureEvent[]
}

export interface MetricsPressureEvent {
  timestamp: number
  condition: string
  value: number
}

export interface ClusterMetricsRangeRequest extends ClusterIdRequest {
  range: MetricsTimeRange
}

export interface HpaMetricsRangeRequest extends ClusterIdRequest {
  namespace: string
  hpaName: string
  range: MetricsTimeRange
}

export interface DeploymentMetricsRangeRequest extends ClusterIdRequest {
  namespace: string
  deploymentName: string
  range: MetricsTimeRange
}

export interface NodePressureRequest extends ClusterIdRequest {
  nodeName: string
  range: MetricsTimeRange
}

export interface NodeMetricsRangeRequest extends ClusterIdRequest {
  nodeName: string
  range: MetricsTimeRange
}

export interface PodMetricsRangeRequest extends ClusterIdRequest {
  namespace: string
  podName: string
  range: MetricsTimeRange
}

export interface ClusterMetricsSummary {
  metricsAvailable: boolean
  totalNodes: number
  readyNodes: number
  notReadyNodes: number
  cpuCapacityCores: number
  memoryCapacityBytes: number
  cpuAllocatableCores: number
  memoryAllocatableBytes: number
  cpuUsageCores?: number
  memoryUsageBytes?: number
  podCapacity: number
  runningPods: number
  pendingPods: number
  failedPods: number
}

export interface NodeMetricEntry {
  name: string
  cpuCapacityCores: number
  memoryCapacityBytes: number
  cpuAllocatableCores: number
  memoryAllocatableBytes: number
  cpuUsageCores?: number
  memoryUsageBytes?: number
}

export interface NodeMetricsResponse {
  metricsAvailable: boolean
  nodes: NodeMetricEntry[]
}
