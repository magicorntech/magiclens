export interface PodContainerPort {
  name?: string
  containerPort: number
  protocol: string
}

export interface PodContainerInfo {
  name: string
  image: string
  ready: boolean
  restartCount: number
  state: string
  ports: PodContainerPort[]
}

export interface PodDetailResponse {
  containers: PodContainerInfo[]
  nodeName: string
  podIP: string
  hostIP: string
  qosClass: string
  labels: Record<string, string>
}

export interface PodContainerMetric {
  name: string
  cpuUsageCores: number
  memoryUsageBytes: number
}

export interface PodMetricsResponse {
  metricsAvailable: boolean
  containers: PodContainerMetric[]
  totalCpuUsageCores: number
  totalMemoryUsageBytes: number
}

export interface PodServicePort {
  name?: string
  port: number
  targetPort: string
  protocol: string
}

export interface PodServiceBinding {
  name: string
  type: string
  clusterIP: string
  ports: PodServicePort[]
}

export interface PodNetworkResponse {
  services: PodServiceBinding[]
}

export interface PodResourceRequest {
  clusterId: string
  namespace: string
  podName: string
}

export interface PodLogsStartRequest {
  sessionId: string
  clusterId: string
  namespace: string
  podName: string
  containerName: string
  tailLines?: number
  timestamps?: boolean
}

export interface PodLogsSessionRequest {
  sessionId: string
}

export interface PodLogsDataPayload {
  sessionId: string
  chunk: string
}

export interface PodLogsEndedPayload {
  sessionId: string
  error?: string
}

export interface PodLogsDownloadRequest {
  clusterId: string
  namespace: string
  podName: string
  containerName: string
  defaultFileName: string
}

export type PodLogsDownloadResponse = { ok: true; filePath: string } | { ok: false; canceled: true } | { ok: false; error: string }

export interface PodExecStartRequest {
  sessionId: string
  clusterId: string
  namespace: string
  podName: string
  containerName: string
  cols: number
  rows: number
}

export interface PodExecInputRequest {
  sessionId: string
  data: string
}

export interface PodExecResizeRequest {
  sessionId: string
  cols: number
  rows: number
}

export interface PodExecSessionRequest {
  sessionId: string
}

export type PodExecStream = 'stdout' | 'stderr'

export interface PodExecDataPayload {
  sessionId: string
  stream: PodExecStream
  chunk: string
}

export interface PodExecExitPayload {
  sessionId: string
  reason: string
}
