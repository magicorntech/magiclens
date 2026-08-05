export interface PodContainerPort {
  name?: string
  containerPort: number
  protocol: string
}

export interface PodResourceQuantities {
  cpu?: string
  memory?: string
  ephemeralStorage?: string
}

export type PodProbeType = 'liveness' | 'readiness' | 'startup'

export interface PodProbeInfo {
  type: PodProbeType
  /** Human readable handler, e.g. "HTTP GET /healthz:8080" or "exec: sh -c ...". */
  handler: string
  initialDelaySeconds?: number
  periodSeconds?: number
  timeoutSeconds?: number
  successThreshold?: number
  failureThreshold?: number
}

export interface PodEnvVar {
  name: string
  value?: string
  /** Where the value comes from when not inline, e.g. "secret: db/password". */
  source?: string
}

export interface PodVolumeMountInfo {
  name: string
  mountPath: string
  readOnly: boolean
  subPath?: string
}

export interface PodSecurityContextInfo {
  runAsUser?: number
  runAsGroup?: number
  fsGroup?: number
  runAsNonRoot?: boolean
  readOnlyRootFilesystem?: boolean
  privileged?: boolean
  allowPrivilegeEscalation?: boolean
  seccompProfile?: string
  capabilitiesAdd?: string[]
  capabilitiesDrop?: string[]
}

export interface PodContainerInfo {
  name: string
  image: string
  imagePullPolicy?: string
  ready: boolean
  started?: boolean
  restartCount: number
  state: string
  stateMessage?: string
  stateStartedAt?: string
  lastTerminatedReason?: string
  lastTerminatedExitCode?: number
  lastTerminatedAt?: string
  ports: PodContainerPort[]
  /** True for init containers. */
  isInit?: boolean
  requests?: PodResourceQuantities
  limits?: PodResourceQuantities
  env: PodEnvVar[]
  mounts: PodVolumeMountInfo[]
  probes: PodProbeInfo[]
  command?: string[]
  args?: string[]
  securityContext?: PodSecurityContextInfo
}

export interface PodVolumeInfo {
  name: string
  /** ConfigMap, Secret, PersistentVolumeClaim, EmptyDir, HostPath, Projected, etc. */
  type: string
  /** e.g. claim name, config map name, host path. */
  detail?: string
}

export interface PodTolerationInfo {
  key?: string
  operator?: string
  value?: string
  effect?: string
  tolerationSeconds?: number
}

export interface PodOwnerRef {
  kind: string
  name: string
  controller: boolean
}

export interface PodConditionInfo {
  type: string
  status: string
  reason?: string
  message?: string
  lastTransitionTime?: string
}

export interface PodDetailData {
  uid: string
  creationTimestamp?: string
  phase: string
  statusText: string
  statusColor: string
  statusDetail?: string
  /** Ready containers over total, e.g. "2/3". */
  ready: string
  totalRestarts: number
  nodeName: string
  podIP: string
  hostIP: string
  qosClass: string
  serviceAccount: string
  priorityClass?: string
  restartPolicy?: string
  labels: Record<string, string>
  annotations: Record<string, string>
  ownerReferences: PodOwnerRef[]
  conditions: PodConditionInfo[]
  nodeSelector: Record<string, string>
  tolerations: PodTolerationInfo[]
  /** Human readable affinity summary lines. */
  affinitySummary: string[]
  securityContext?: PodSecurityContextInfo
  volumes: PodVolumeInfo[]
  containers: PodContainerInfo[]
  initContainers: PodContainerInfo[]
}

export type PodDetailResponse = PodDetailData | { error: string }

export function isPodDetailData(data: PodDetailResponse | undefined): data is PodDetailData {
  return !!data && !('error' in data)
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

export interface NamespacePodMetricsRequest {
  clusterId: string
  namespace: string
}

export interface NamespacePodMetricItem {
  podName: string
  /** Pod namespace; always set so 'ALL' requests can be mapped back per pod. */
  namespace?: string
  cpuUsageCores: number
  memoryUsageBytes: number
}

export interface NamespacePodMetricsResponse {
  metricsAvailable: boolean
  pods: NamespacePodMetricItem[]
}

export interface PodLogsStartRequest {
  sessionId: string
  clusterId: string
  namespace: string
  podName: string
  containerName: string
  tailLines?: number
  timestamps?: boolean
  sinceTime?: string
  previous?: boolean
  follow?: boolean
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
