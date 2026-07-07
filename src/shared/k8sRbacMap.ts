import type { ResourceKind } from './resourceKinds'

export interface K8sRbacMeta {
  group: string
  resource: string
  namespaced: boolean
}

/** Maps MagicLens built-in kinds to Kubernetes RBAC resource attributes. */
export const BUILTIN_RBAC: Record<ResourceKind, K8sRbacMeta> = {
  Nodes: { group: '', resource: 'nodes', namespaced: false },
  Namespaces: { group: '', resource: 'namespaces', namespaced: false },
  Pods: { group: '', resource: 'pods', namespaced: true },
  Deployments: { group: 'apps', resource: 'deployments', namespaced: true },
  StatefulSets: { group: 'apps', resource: 'statefulsets', namespaced: true },
  DaemonSets: { group: 'apps', resource: 'daemonsets', namespaced: true },
  ReplicaSets: { group: 'apps', resource: 'replicasets', namespaced: true },
  ReplicationControllers: { group: '', resource: 'replicationcontrollers', namespaced: true },
  Jobs: { group: 'batch', resource: 'jobs', namespaced: true },
  CronJobs: { group: 'batch', resource: 'cronjobs', namespaced: true },
  ConfigMaps: { group: '', resource: 'configmaps', namespaced: true },
  Secrets: { group: '', resource: 'secrets', namespaced: true },
  ResourceQuotas: { group: '', resource: 'resourcequotas', namespaced: true },
  LimitRanges: { group: '', resource: 'limitranges', namespaced: true },
  HorizontalPodAutoscalers: { group: 'autoscaling', resource: 'horizontalpodautoscalers', namespaced: true },
  PodDisruptionBudgets: { group: 'policy', resource: 'poddisruptionbudgets', namespaced: true },
  PriorityClasses: { group: 'scheduling.k8s.io', resource: 'priorityclasses', namespaced: false },
  RuntimeClasses: { group: 'node.k8s.io', resource: 'runtimeclasses', namespaced: false },
  Leases: { group: 'coordination.k8s.io', resource: 'leases', namespaced: true },
  MutatingWebhookConfigurations: { group: 'admissionregistration.k8s.io', resource: 'mutatingwebhookconfigurations', namespaced: false },
  ValidatingWebhookConfigurations: { group: 'admissionregistration.k8s.io', resource: 'validatingwebhookconfigurations', namespaced: false },
  ValidatingAdmissionPolicies: { group: 'admissionregistration.k8s.io', resource: 'validatingadmissionpolicies', namespaced: false },
  ValidatingAdmissionPolicyBindings: { group: 'admissionregistration.k8s.io', resource: 'validatingadmissionpolicybindings', namespaced: false },
  Services: { group: '', resource: 'services', namespaced: true },
  EndpointSlices: { group: 'discovery.k8s.io', resource: 'endpointslices', namespaced: true },
  Endpoints: { group: '', resource: 'endpoints', namespaced: true },
  Ingresses: { group: 'networking.k8s.io', resource: 'ingresses', namespaced: true },
  IngressClasses: { group: 'networking.k8s.io', resource: 'ingressclasses', namespaced: false },
  NetworkPolicies: { group: 'networking.k8s.io', resource: 'networkpolicies', namespaced: true },
  PersistentVolumeClaims: { group: '', resource: 'persistentvolumeclaims', namespaced: true },
  PersistentVolumes: { group: '', resource: 'persistentvolumes', namespaced: false },
  StorageClasses: { group: 'storage.k8s.io', resource: 'storageclasses', namespaced: false },
  ServiceAccounts: { group: '', resource: 'serviceaccounts', namespaced: true },
  Roles: { group: 'rbac.authorization.k8s.io', resource: 'roles', namespaced: true },
  RoleBindings: { group: 'rbac.authorization.k8s.io', resource: 'rolebindings', namespaced: true },
  ClusterRoles: { group: 'rbac.authorization.k8s.io', resource: 'clusterroles', namespaced: false },
  ClusterRoleBindings: { group: 'rbac.authorization.k8s.io', resource: 'clusterrolebindings', namespaced: false },
  CustomResourceDefinitions: { group: 'apiextensions.k8s.io', resource: 'customresourcedefinitions', namespaced: false },
  Events: { group: '', resource: 'events', namespaced: true }
}
