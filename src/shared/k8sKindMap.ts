import type { ResourceKind } from '@shared/resourceKinds'

/** Maps Kubernetes `kind` (singular) to MagicLens built-in resource tabs. */
export const K8S_KIND_TO_RESOURCE: Record<string, ResourceKind> = {
  Node: 'Nodes',
  Namespace: 'Namespaces',
  Pod: 'Pods',
  Deployment: 'Deployments',
  StatefulSet: 'StatefulSets',
  DaemonSet: 'DaemonSets',
  ReplicaSet: 'ReplicaSets',
  ReplicationController: 'ReplicationControllers',
  Job: 'Jobs',
  CronJob: 'CronJobs',
  ConfigMap: 'ConfigMaps',
  Secret: 'Secrets',
  ResourceQuota: 'ResourceQuotas',
  LimitRange: 'LimitRanges',
  HorizontalPodAutoscaler: 'HorizontalPodAutoscalers',
  PodDisruptionBudget: 'PodDisruptionBudgets',
  PriorityClass: 'PriorityClasses',
  RuntimeClass: 'RuntimeClasses',
  Lease: 'Leases',
  MutatingWebhookConfiguration: 'MutatingWebhookConfigurations',
  ValidatingWebhookConfiguration: 'ValidatingWebhookConfigurations',
  ValidatingAdmissionPolicy: 'ValidatingAdmissionPolicies',
  ValidatingAdmissionPolicyBinding: 'ValidatingAdmissionPolicyBindings',
  Service: 'Services',
  EndpointSlice: 'EndpointSlices',
  Endpoints: 'Endpoints',
  Ingress: 'Ingresses',
  IngressClass: 'IngressClasses',
  NetworkPolicy: 'NetworkPolicies',
  PersistentVolumeClaim: 'PersistentVolumeClaims',
  PersistentVolume: 'PersistentVolumes',
  StorageClass: 'StorageClasses',
  ServiceAccount: 'ServiceAccounts',
  Role: 'Roles',
  RoleBinding: 'RoleBindings',
  ClusterRole: 'ClusterRoles',
  ClusterRoleBinding: 'ClusterRoleBindings',
  CustomResourceDefinition: 'CustomResourceDefinitions',
  Event: 'Events'
}

export function k8sKindToResourceKind(k8sKind: string): ResourceKind | null {
  return K8S_KIND_TO_RESOURCE[k8sKind] ?? null
}
