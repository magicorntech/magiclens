import type { ResourceKind } from '@shared/resourceKinds'
import { isNamespaceScoped } from '@shared/resourceKinds'

/** Mirrors `resourceRegistry.ts`'s GVK table + `K8S_KIND_NAME` on the main process side — kept in
 * sync manually since these are static Kubernetes API facts that don't change at runtime. Used to
 * build a "New resource" YAML template without an extra IPC round-trip. */
const BUILTIN_API_VERSION: Record<ResourceKind, string> = {
  Nodes: 'v1',
  Namespaces: 'v1',
  Pods: 'v1',
  Deployments: 'apps/v1',
  StatefulSets: 'apps/v1',
  DaemonSets: 'apps/v1',
  ReplicaSets: 'apps/v1',
  ReplicationControllers: 'v1',
  Jobs: 'batch/v1',
  CronJobs: 'batch/v1',
  Services: 'v1',
  EndpointSlices: 'discovery.k8s.io/v1',
  Endpoints: 'v1',
  Ingresses: 'networking.k8s.io/v1',
  IngressClasses: 'networking.k8s.io/v1',
  NetworkPolicies: 'networking.k8s.io/v1',
  ConfigMaps: 'v1',
  Secrets: 'v1',
  ResourceQuotas: 'v1',
  LimitRanges: 'v1',
  HorizontalPodAutoscalers: 'autoscaling/v2',
  PodDisruptionBudgets: 'policy/v1',
  PriorityClasses: 'scheduling.k8s.io/v1',
  RuntimeClasses: 'node.k8s.io/v1',
  Leases: 'coordination.k8s.io/v1',
  MutatingWebhookConfigurations: 'admissionregistration.k8s.io/v1',
  ValidatingWebhookConfigurations: 'admissionregistration.k8s.io/v1',
  ValidatingAdmissionPolicies: 'admissionregistration.k8s.io/v1',
  ValidatingAdmissionPolicyBindings: 'admissionregistration.k8s.io/v1',
  PersistentVolumeClaims: 'v1',
  PersistentVolumes: 'v1',
  StorageClasses: 'storage.k8s.io/v1',
  ServiceAccounts: 'v1',
  Roles: 'rbac.authorization.k8s.io/v1',
  ClusterRoles: 'rbac.authorization.k8s.io/v1',
  RoleBindings: 'rbac.authorization.k8s.io/v1',
  ClusterRoleBindings: 'rbac.authorization.k8s.io/v1',
  CustomResourceDefinitions: 'apiextensions.k8s.io/v1',
  Events: 'v1'
}

export const K8S_KIND_NAME: Record<ResourceKind, string> = {
  Nodes: 'Node',
  Namespaces: 'Namespace',
  Pods: 'Pod',
  Deployments: 'Deployment',
  StatefulSets: 'StatefulSet',
  DaemonSets: 'DaemonSet',
  ReplicaSets: 'ReplicaSet',
  ReplicationControllers: 'ReplicationController',
  Jobs: 'Job',
  CronJobs: 'CronJob',
  Services: 'Service',
  EndpointSlices: 'EndpointSlice',
  Endpoints: 'Endpoints',
  Ingresses: 'Ingress',
  IngressClasses: 'IngressClass',
  NetworkPolicies: 'NetworkPolicy',
  ConfigMaps: 'ConfigMap',
  Secrets: 'Secret',
  ResourceQuotas: 'ResourceQuota',
  LimitRanges: 'LimitRange',
  HorizontalPodAutoscalers: 'HorizontalPodAutoscaler',
  PodDisruptionBudgets: 'PodDisruptionBudget',
  PriorityClasses: 'PriorityClass',
  RuntimeClasses: 'RuntimeClass',
  Leases: 'Lease',
  MutatingWebhookConfigurations: 'MutatingWebhookConfiguration',
  ValidatingWebhookConfigurations: 'ValidatingWebhookConfiguration',
  ValidatingAdmissionPolicies: 'ValidatingAdmissionPolicy',
  ValidatingAdmissionPolicyBindings: 'ValidatingAdmissionPolicyBinding',
  PersistentVolumeClaims: 'PersistentVolumeClaim',
  PersistentVolumes: 'PersistentVolume',
  StorageClasses: 'StorageClass',
  ServiceAccounts: 'ServiceAccount',
  Roles: 'Role',
  ClusterRoles: 'ClusterRole',
  RoleBindings: 'RoleBinding',
  ClusterRoleBindings: 'ClusterRoleBinding',
  CustomResourceDefinitions: 'CustomResourceDefinition',
  Events: 'Event'
}

const EXTRA_BODY: Partial<Record<ResourceKind, string>> = {
  ConfigMaps: 'data:\n  key: value\n',
  Secrets: 'type: Opaque\nstringData:\n  key: value\n',
  Pods: 'spec:\n  containers:\n    - name: main\n      image: nginx:latest\n',
  Deployments:
    'spec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: my-app\n  template:\n    metadata:\n      labels:\n        app: my-app\n    spec:\n      containers:\n        - name: main\n          image: nginx:latest\n',
  Services: 'spec:\n  selector:\n    app: my-app\n  ports:\n    - port: 80\n      targetPort: 80\n'
}

export function buildCreateTemplate(kind: ResourceKind, namespace: string): string {
  const apiVersion = BUILTIN_API_VERSION[kind]
  const k8sKind = K8S_KIND_NAME[kind]
  const namespaced = isNamespaceScoped(kind)
  const metaNamespace = namespaced && namespace !== 'ALL' ? `\n  namespace: ${namespace}` : ''
  const body = EXTRA_BODY[kind] ?? ''
  return `apiVersion: ${apiVersion}\nkind: ${k8sKind}\nmetadata:\n  name: my-${k8sKind.toLowerCase()}${metaNamespace}\n${body}`
}

export function builtinApiVersionOf(kind: ResourceKind): string {
  return BUILTIN_API_VERSION[kind]
}
