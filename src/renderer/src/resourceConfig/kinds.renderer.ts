import type { ResourceKind } from '@shared/resourceKinds'
import type { ColumnDef } from '@shared/types/resource'
import type { VirtualPageKey } from '@shared/types/navigation'
import { kindIcons, virtualPageIconComponents } from '../icons/resourceKindIcons'

export type { VirtualPageKey }

export interface VirtualMenuItem {
  key: VirtualPageKey
  label: string
  icon: React.ComponentType
}

export { kindIcons }

export interface KindSubGroup {
  title: string
  kinds: ResourceKind[]
}

export interface KindGroup {
  title: string
  kinds: ResourceKind[]
  subGroups?: KindSubGroup[]
  virtualEntries?: VirtualMenuItem[]
}

/** Standalone top-level entry rendered above the collapsible groups, mirroring Lens's sidebar. */
export const standaloneKind: ResourceKind = 'Nodes'

export const kindGroups: KindGroup[] = [
  {
    title: 'Workloads',
    kinds: ['Pods', 'Deployments', 'DaemonSets', 'StatefulSets', 'ReplicaSets', 'ReplicationControllers', 'Jobs', 'CronJobs']
  },
  {
    title: 'Config',
    kinds: [
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
      'ValidatingAdmissionPolicyBindings'
    ]
  },
  {
    title: 'Network',
    kinds: ['Services', 'EndpointSlices', 'Endpoints', 'Ingresses', 'IngressClasses', 'NetworkPolicies'],
    virtualEntries: [{ key: 'portForwarding', label: 'Port Forwarding', icon: virtualPageIconComponents.portForwarding }]
  },
  {
    title: 'Storage',
    kinds: ['PersistentVolumeClaims', 'PersistentVolumes', 'StorageClasses']
  },
  {
    title: 'Helm',
    kinds: [],
    virtualEntries: [
      { key: 'helmCharts', label: 'Charts', icon: virtualPageIconComponents.helmCharts },
      { key: 'helmReleases', label: 'Releases', icon: virtualPageIconComponents.helmReleases }
    ]
  },
  {
    title: 'Access Control',
    kinds: ['ServiceAccounts', 'ClusterRoles', 'Roles', 'ClusterRoleBindings', 'RoleBindings']
  },
  {
    title: 'Custom Resources',
    kinds: ['CustomResourceDefinitions'],
    virtualEntries: [
      { key: 'operatorResources', label: 'Installed CRDs', icon: virtualPageIconComponents.operatorResources },
      { key: 'dynamicCustomResources', label: 'Dynamic Resources', icon: virtualPageIconComponents.dynamicCustomResources }
    ]
  }
]

export const kindColumnDefs: Record<ResourceKind, ColumnDef[]> = {
  Nodes: [
    { key: 'roles', title: 'Roles' },
    { key: 'version', title: 'Version' }
  ],
  Namespaces: [],
  Pods: [
    { key: 'containers', title: 'Containers' },
    { key: 'restarts', title: 'Restarts' },
    { key: 'controlledBy', title: 'Controlled By' },
    { key: 'node', title: 'Node' },
    { key: 'qos', title: 'QoS' }
  ],
  Deployments: [
    { key: 'ready', title: 'Ready' },
    { key: 'controlledBy', title: 'Controlled By' }
  ],
  StatefulSets: [
    { key: 'ready', title: 'Ready' },
    { key: 'controlledBy', title: 'Controlled By' }
  ],
  DaemonSets: [
    { key: 'ready', title: 'Ready' },
    { key: 'controlledBy', title: 'Controlled By' }
  ],
  ReplicaSets: [
    { key: 'ready', title: 'Ready' },
    { key: 'controlledBy', title: 'Controlled By' }
  ],
  ReplicationControllers: [
    { key: 'ready', title: 'Ready' },
    { key: 'controlledBy', title: 'Controlled By' }
  ],
  Jobs: [{ key: 'completions', title: 'Completions' }],
  CronJobs: [{ key: 'schedule', title: 'Schedule' }],
  ConfigMaps: [{ key: 'keys', title: 'Keys' }],
  Secrets: [
    { key: 'type', title: 'Type' },
    { key: 'keys', title: 'Keys' }
  ],
  ResourceQuotas: [{ key: 'hard', title: 'Hard limits' }],
  LimitRanges: [{ key: 'limits', title: 'Limits' }],
  HorizontalPodAutoscalers: [
    { key: 'target', title: 'Target' },
    { key: 'minMax', title: 'Min/Max' },
    { key: 'replicas', title: 'Replicas' }
  ],
  PodDisruptionBudgets: [
    { key: 'minAvailable', title: 'Min available' },
    { key: 'currentHealthy', title: 'Current healthy' },
    { key: 'desiredHealthy', title: 'Desired healthy' },
    { key: 'allowedDisruptions', title: 'Allowed disruptions' }
  ],
  PriorityClasses: [
    { key: 'value', title: 'Value' },
    { key: 'globalDefault', title: 'Global default' }
  ],
  RuntimeClasses: [{ key: 'handler', title: 'Handler' }],
  Leases: [{ key: 'holder', title: 'Holder' }],
  MutatingWebhookConfigurations: [{ key: 'webhooks', title: 'Webhooks' }],
  ValidatingWebhookConfigurations: [{ key: 'webhooks', title: 'Webhooks' }],
  ValidatingAdmissionPolicies: [{ key: 'validations', title: 'Validations' }],
  ValidatingAdmissionPolicyBindings: [{ key: 'policyName', title: 'Policy' }],
  Services: [
    { key: 'type', title: 'Type' },
    { key: 'clusterIP', title: 'Cluster IP' },
    { key: 'ports', title: 'Ports' }
  ],
  EndpointSlices: [
    { key: 'addressType', title: 'Address type' },
    { key: 'endpoints', title: 'Endpoints' }
  ],
  Endpoints: [{ key: 'addresses', title: 'Addresses' }],
  Ingresses: [
    { key: 'ingressClass', title: 'Class' },
    { key: 'addresses', title: 'Address' },
    { key: 'hosts', title: 'Hosts' }
  ],
  IngressClasses: [{ key: 'controller', title: 'Controller' }],
  NetworkPolicies: [{ key: 'policyTypes', title: 'Policy types' }],
  PersistentVolumeClaims: [{ key: 'capacity', title: 'Capacity' }],
  PersistentVolumes: [{ key: 'capacity', title: 'Capacity' }],
  StorageClasses: [
    { key: 'provisioner', title: 'Provisioner' },
    { key: 'reclaimPolicy', title: 'Reclaim policy' }
  ],
  ServiceAccounts: [{ key: 'secrets', title: 'Secrets' }],
  Roles: [{ key: 'rules', title: 'Rules' }],
  RoleBindings: [
    { key: 'role', title: 'Role' },
    { key: 'subjects', title: 'Subjects' }
  ],
  ClusterRoles: [{ key: 'rules', title: 'Rules' }],
  ClusterRoleBindings: [
    { key: 'role', title: 'Role' },
    { key: 'subjects', title: 'Subjects' }
  ],
  CustomResourceDefinitions: [
    { key: 'group', title: 'Group' },
    { key: 'kind', title: 'Kind' },
    { key: 'scope', title: 'Scope' }
  ],
  Events: [
    { key: 'reason', title: 'Reason' },
    { key: 'object', title: 'Object' },
    { key: 'message', title: 'Message' }
  ]
}
