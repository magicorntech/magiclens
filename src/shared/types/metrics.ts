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
  cpuUsageCores?: number
  memoryUsageBytes?: number
}

export interface NodeMetricsResponse {
  metricsAvailable: boolean
  nodes: NodeMetricEntry[]
}
