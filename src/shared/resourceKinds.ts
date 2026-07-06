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
