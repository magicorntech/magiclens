import type { ResourceKind } from '../resourceKinds'
import type { ClusterIdRequest } from './cluster'
import type { ResourceMutationTarget } from './resourceMutation'

export type WorkloadKind =
  | 'Deployments'
  | 'StatefulSets'
  | 'DaemonSets'
  | 'ReplicaSets'
  | 'ReplicationControllers'
  | 'Jobs'
  | 'CronJobs'
  | 'HorizontalPodAutoscalers'

export const WORKLOAD_KINDS: ReadonlySet<ResourceKind> = new Set([
  'Deployments',
  'StatefulSets',
  'DaemonSets',
  'ReplicaSets',
  'ReplicationControllers',
  'Jobs',
  'CronJobs',
  'HorizontalPodAutoscalers'
])

export function isWorkloadKind(kind: ResourceKind): kind is WorkloadKind {
  return WORKLOAD_KINDS.has(kind)
}

/** Workloads that own pods directly — aggregated Logs tab is available for these. */
export const WORKLOAD_LOG_KINDS: ReadonlySet<WorkloadKind> = new Set([
  'Deployments',
  'StatefulSets',
  'DaemonSets',
  'ReplicaSets',
  'ReplicationControllers',
  'Jobs'
])

export function isWorkloadLogKind(kind: ResourceKind): kind is WorkloadKind {
  return WORKLOAD_LOG_KINDS.has(kind as WorkloadKind)
}

export type WorkloadActionId =
  | 'scale'
  | 'restart'
  | 'pauseRollout'
  | 'resumeRollout'
  | 'rollback'
  | 'rolloutHistory'
  | 'rolloutStatus'
  | 'changeImage'
  | 'suspend'
  | 'resume'
  | 'rerun'
  | 'triggerManual'
  | 'viewPods'
  | 'viewReplicaSets'
  | 'viewOwnerDeployment'
  | 'viewPvcs'
  | 'viewJobs'
  | 'viewTargetWorkload'
  | 'deletePods'
  | 'editYaml'
  | 'delete'

export interface WorkloadTargetRequest extends ClusterIdRequest {
  kind: WorkloadKind
  namespace: string
  name: string
}

export interface WorkloadScaleRequest extends WorkloadTargetRequest {
  replicas: number
}

export interface WorkloadChangeImageRequest extends WorkloadTargetRequest {
  containerName: string
  image: string
}

export interface WorkloadRollbackRequest extends WorkloadTargetRequest {
  revision: number
}

export interface WorkloadActionResult {
  ok: true
  kubectlCommand: string
}

export type WorkloadActionResponse = WorkloadActionResult | { error: string }

export interface RolloutRevision {
  revision: number
  replicaSetName: string
  replicas: number
  readyReplicas: number
  createdAt: string | null
  isCurrent: boolean
  images: string[]
}

export interface RolloutHistoryResponse {
  currentRevision: number
  revisions: RolloutRevision[]
}

export interface WorkloadContainerInfo {
  name: string
  image: string
}

export interface WorkloadScaleInfo {
  currentReplicas: number
  readyReplicas: number
  kubectlResource: string
  hasOwnerDeployment: boolean
  ownerDeploymentName?: string
  statefulWarning?: boolean
  affectedOrdinals?: number[]
}

export interface HpaAttachment {
  name: string
  namespace: string
  minReplicas?: number
  maxReplicas?: number
  currentReplicas?: number
}

export interface PdbAttachment {
  name: string
  namespace: string
  minAvailable?: string
  maxUnavailable?: string
}

export interface WorkloadContextInfo {
  replicas?: WorkloadScaleInfo
  containers: WorkloadContainerInfo[]
  paused?: boolean
  suspended?: boolean
  hpa?: HpaAttachment
  pdb?: PdbAttachment
  scaleTargetRef?: { kind: string; name: string }
  extensions: {
    argoRollouts: boolean
    keda: boolean
  }
}

export interface WorkloadPermissionsResponse {
  canGet: boolean
  canUpdate: boolean
  canPatch: boolean
  canDelete: boolean
  canScale: boolean
  canDeletePods: boolean
  canCreateJobs: boolean
  verified: boolean
}

export interface WorkloadPermissionsRequest extends ClusterIdRequest {
  target: ResourceMutationTarget
  namespace: string
  name: string
}

export interface WorkloadPodInfo {
  name: string
  containers: string[]
  ready: boolean
  status: string
}

export type WorkloadPodsResponse = { pods: WorkloadPodInfo[] } | { error: string }

export interface WorkloadAuditEntry {
  id: string
  clusterId: string
  kind: string
  namespace: string
  name: string
  action: WorkloadActionId
  kubectlCommand?: string
  timestamp: string
  success: boolean
  error?: string
}
