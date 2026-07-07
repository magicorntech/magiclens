import type { WorkloadKind } from './types/workload'

const KUBECTL_RESOURCE: Record<WorkloadKind, string> = {
  Deployments: 'deployment',
  StatefulSets: 'statefulset',
  DaemonSets: 'daemonset',
  ReplicaSets: 'replicaset',
  ReplicationControllers: 'replicationcontroller',
  Jobs: 'job',
  CronJobs: 'cronjob',
  HorizontalPodAutoscalers: 'hpa'
}

export function kubectlResourceName(kind: WorkloadKind): string {
  return KUBECTL_RESOURCE[kind]
}

export function kubectlScaleCommand(kind: WorkloadKind, name: string, namespace: string, replicas: number): string {
  return `kubectl scale ${kubectlResourceName(kind)} ${name} -n ${namespace} --replicas=${replicas}`
}

export function kubectlRestartCommand(kind: WorkloadKind, name: string, namespace: string): string {
  return `kubectl rollout restart ${kubectlResourceName(kind)} ${name} -n ${namespace}`
}

export function kubectlRollbackCommand(name: string, namespace: string, revision: number): string {
  return `kubectl rollout undo deployment ${name} -n ${namespace} --to-revision=${revision}`
}

export function kubectlDeletePodsCommand(namespace: string, labelSelector: string): string {
  return `kubectl delete pods -n ${namespace} -l ${labelSelector}`
}
