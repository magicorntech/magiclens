export const RESOURCE_KINDS = [
  'Nodes',
  'Namespaces',
  'Pods',
  'Deployments',
  'StatefulSets',
  'DaemonSets',
  'ReplicaSets',
  'ReplicationControllers',
  'Jobs',
  'CronJobs',
  'ConfigMaps',
  'Secrets',
  'ResourceQuotas',
  'LimitRanges',
  'HorizontalPodAutoscalers',
  'PodDisruptionBudgets',
  'PriorityClasses',
  'RuntimeClasses',
  'Leases',
  'MutatingWebhookConfigurations',
  'ValidatingWebhookConfigurations',
  'ValidatingAdmissionPolicies',
  'ValidatingAdmissionPolicyBindings',
  'Services',
  'EndpointSlices',
  'Endpoints',
  'Ingresses',
  'IngressClasses',
  'NetworkPolicies',
  'PersistentVolumeClaims',
  'PersistentVolumes',
  'StorageClasses',
  'ServiceAccounts',
  'Roles',
  'RoleBindings',
  'ClusterRoles',
  'ClusterRoleBindings',
  'CustomResourceDefinitions',
  'Events'
] as const

export type ResourceKind = (typeof RESOURCE_KINDS)[number]

export const CLUSTER_SCOPED_KINDS: ReadonlySet<ResourceKind> = new Set([
  'Nodes',
  'Namespaces',
  'PriorityClasses',
  'RuntimeClasses',
  'MutatingWebhookConfigurations',
  'ValidatingWebhookConfigurations',
  'ValidatingAdmissionPolicies',
  'ValidatingAdmissionPolicyBindings',
  'IngressClasses',
  'PersistentVolumes',
  'StorageClasses',
  'ClusterRoles',
  'ClusterRoleBindings',
  'CustomResourceDefinitions'
])

export function isNamespaceScoped(kind: ResourceKind): boolean {
  return !CLUSTER_SCOPED_KINDS.has(kind)
}

/** Kubernetes API kind (`Pod`, `Deployment`) → MagicLens list kind (`Pods`, `Deployments`). */
const API_KIND_TO_RESOURCE: Record<string, ResourceKind> = {
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

export function apiKindToResourceKind(kind: string): ResourceKind | null {
  if ((RESOURCE_KINDS as readonly string[]).includes(kind)) return kind as ResourceKind
  return API_KIND_TO_RESOURCE[kind] ?? null
}
