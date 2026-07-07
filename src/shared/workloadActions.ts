import type { WorkloadActionId, WorkloadKind } from './types/workload'

export interface WorkloadActionDef {
  id: WorkloadActionId
  label: string
  danger?: boolean
  dividerBefore?: boolean
}

const deploymentActions: WorkloadActionDef[] = [
  { id: 'scale', label: 'Scale replicas' },
  { id: 'restart', label: 'Restart rollout' },
  { id: 'pauseRollout', label: 'Pause rollout' },
  { id: 'resumeRollout', label: 'Resume rollout' },
  { id: 'rollback', label: 'Rollback rollout' },
  { id: 'rolloutHistory', label: 'View rollout history' },
  { id: 'viewReplicaSets', label: 'View related ReplicaSets' },
  { id: 'viewPods', label: 'View related Pods' },
  { id: 'changeImage', label: 'Change container image' },
  { id: 'deletePods', label: 'Delete pods (manual restart)', dividerBefore: true },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

const statefulSetActions: WorkloadActionDef[] = [
  { id: 'scale', label: 'Scale replicas' },
  { id: 'restart', label: 'Restart rollout' },
  { id: 'rolloutStatus', label: 'View rollout status' },
  { id: 'viewPods', label: 'View related Pods' },
  { id: 'viewPvcs', label: 'View related PVCs' },
  { id: 'changeImage', label: 'Change container image' },
  { id: 'deletePods', label: 'Delete pods (manual restart)', dividerBefore: true },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

const daemonSetActions: WorkloadActionDef[] = [
  { id: 'restart', label: 'Restart rollout' },
  { id: 'rolloutStatus', label: 'View rollout status' },
  { id: 'viewPods', label: 'View pods on each node' },
  { id: 'changeImage', label: 'Change container image' },
  { id: 'deletePods', label: 'Delete pods (manual restart)', dividerBefore: true },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

const replicaSetActions: WorkloadActionDef[] = [
  { id: 'scale', label: 'Scale replicas' },
  { id: 'viewPods', label: 'View related Pods' },
  { id: 'viewOwnerDeployment', label: 'View owner Deployment' },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete ReplicaSet', danger: true }
]

const replicationControllerActions: WorkloadActionDef[] = [
  { id: 'scale', label: 'Scale replicas' },
  { id: 'viewPods', label: 'View related Pods' },
  { id: 'deletePods', label: 'Delete pods (manual restart)', dividerBefore: true },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

const jobActions: WorkloadActionDef[] = [
  { id: 'suspend', label: 'Suspend job' },
  { id: 'resume', label: 'Resume job' },
  { id: 'rerun', label: 'Rerun job' },
  { id: 'viewPods', label: 'View pods' },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete job', danger: true }
]

const cronJobActions: WorkloadActionDef[] = [
  { id: 'suspend', label: 'Suspend' },
  { id: 'resume', label: 'Resume' },
  { id: 'triggerManual', label: 'Trigger manually' },
  { id: 'viewJobs', label: 'View Jobs' },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

const hpaActions: WorkloadActionDef[] = [
  { id: 'viewTargetWorkload', label: 'View target workload' },
  { id: 'rolloutHistory', label: 'View scale history' },
  { id: 'editYaml', label: 'Edit YAML', dividerBefore: true },
  { id: 'delete', label: 'Delete', danger: true }
]

export const WORKLOAD_ACTIONS_BY_KIND: Record<WorkloadKind, WorkloadActionDef[]> = {
  Deployments: deploymentActions,
  StatefulSets: statefulSetActions,
  DaemonSets: daemonSetActions,
  ReplicaSets: replicaSetActions,
  ReplicationControllers: replicationControllerActions,
  Jobs: jobActions,
  CronJobs: cronJobActions,
  HorizontalPodAutoscalers: hpaActions
}

const PERMISSION_MAP: Partial<Record<WorkloadActionId, keyof import('./types/workload').WorkloadPermissionsResponse>> = {
  scale: 'canScale',
  restart: 'canPatch',
  pauseRollout: 'canPatch',
  resumeRollout: 'canPatch',
  rollback: 'canPatch',
  changeImage: 'canPatch',
  suspend: 'canPatch',
  resume: 'canPatch',
  rerun: 'canCreateJobs',
  triggerManual: 'canCreateJobs',
  deletePods: 'canDeletePods',
  editYaml: 'canUpdate',
  delete: 'canDelete'
}

export function actionRequiresPermission(actionId: WorkloadActionId): keyof import('./types/workload').WorkloadPermissionsResponse | null {
  return PERMISSION_MAP[actionId] ?? null
}
