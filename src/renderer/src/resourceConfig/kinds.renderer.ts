import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BlockOutlined,
  BranchesOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  CodeSandboxOutlined,
  CompassOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FlagOutlined,
  ForkOutlined,
  GlobalOutlined,
  GoldOutlined,
  HddOutlined,
  IdcardOutlined,
  KeyOutlined,
  LinkOutlined,
  LockOutlined,
  NodeIndexOutlined,
  NotificationOutlined,
  PartitionOutlined,
  PieChartOutlined,
  RiseOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  ShareAltOutlined,
  SlidersOutlined,
  TagsOutlined
} from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ColumnDef } from '@shared/types/resource'

export type VirtualPageKey =
  | 'portForwarding'
  | 'dynamicCustomResources'
  | 'operatorResources'
  | 'discoveredApiGroups'
  | 'discoveredApiVersions'
  | 'helmCharts'
  | 'helmReleases'

export interface VirtualMenuItem {
  key: VirtualPageKey
  label: string
  icon: React.ComponentType
}

export const kindIcons: Record<ResourceKind, React.ComponentType> = {
  Nodes: ClusterOutlined,
  Namespaces: AppstoreOutlined,
  Pods: ContainerOutlined,
  Deployments: DeploymentUnitOutlined,
  StatefulSets: DatabaseOutlined,
  DaemonSets: ApartmentOutlined,
  ReplicaSets: BranchesOutlined,
  ReplicationControllers: ForkOutlined,
  Jobs: ScheduleOutlined,
  CronJobs: ClockCircleOutlined,
  ConfigMaps: FileTextOutlined,
  Secrets: LockOutlined,
  ResourceQuotas: PieChartOutlined,
  LimitRanges: SlidersOutlined,
  HorizontalPodAutoscalers: RiseOutlined,
  PodDisruptionBudgets: SafetyOutlined,
  PriorityClasses: FlagOutlined,
  RuntimeClasses: CodeSandboxOutlined,
  Leases: KeyOutlined,
  MutatingWebhookConfigurations: ApiOutlined,
  ValidatingWebhookConfigurations: ApiOutlined,
  ValidatingAdmissionPolicies: FileProtectOutlined,
  ValidatingAdmissionPolicyBindings: LinkOutlined,
  Services: GlobalOutlined,
  EndpointSlices: NodeIndexOutlined,
  Endpoints: ShareAltOutlined,
  Ingresses: GlobalOutlined,
  IngressClasses: TagsOutlined,
  NetworkPolicies: SafetyCertificateOutlined,
  PersistentVolumeClaims: HddOutlined,
  PersistentVolumes: HddOutlined,
  StorageClasses: CloudServerOutlined,
  ServiceAccounts: IdcardOutlined,
  Roles: SafetyCertificateOutlined,
  RoleBindings: LinkOutlined,
  ClusterRoles: SafetyCertificateOutlined,
  ClusterRoleBindings: LinkOutlined,
  CustomResourceDefinitions: BlockOutlined,
  Events: NotificationOutlined
}

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
      'ValidatingWebhookConfigurations'
    ],
    subGroups: [
      { title: 'Admission Policies', kinds: ['ValidatingAdmissionPolicies', 'ValidatingAdmissionPolicyBindings'] }
    ]
  },
  {
    title: 'Network',
    kinds: ['Services', 'EndpointSlices', 'Endpoints', 'Ingresses', 'IngressClasses', 'NetworkPolicies'],
    virtualEntries: [{ key: 'portForwarding', label: 'Port Forwarding', icon: ApiOutlined }]
  },
  {
    title: 'Storage',
    kinds: ['PersistentVolumeClaims', 'PersistentVolumes', 'StorageClasses']
  },
  {
    title: 'Access Control',
    kinds: ['ServiceAccounts', 'ClusterRoles', 'Roles', 'ClusterRoleBindings', 'RoleBindings']
  },
  {
    title: 'Custom Resources',
    kinds: ['CustomResourceDefinitions'],
    virtualEntries: [
      { key: 'dynamicCustomResources', label: 'Dynamic Custom Resources', icon: ExperimentOutlined },
      { key: 'operatorResources', label: 'Installed Operator Resources', icon: PartitionOutlined },
      { key: 'discoveredApiGroups', label: 'Discovered API Groups', icon: CompassOutlined },
      { key: 'discoveredApiVersions', label: 'Discovered API Versions', icon: BranchesOutlined }
    ]
  },
  {
    title: 'Helm',
    kinds: [],
    virtualEntries: [
      { key: 'helmCharts', label: 'Charts', icon: GoldOutlined },
      { key: 'helmReleases', label: 'Releases', icon: RocketOutlined }
    ]
  },
  {
    title: 'Cluster',
    kinds: ['Namespaces', 'Events']
  }
]

export const kindColumnDefs: Record<ResourceKind, ColumnDef[]> = {
  Nodes: [
    { key: 'roles', title: 'Roles' },
    { key: 'version', title: 'Version' }
  ],
  Namespaces: [],
  Pods: [
    { key: 'ready', title: 'Ready' },
    { key: 'restarts', title: 'Restarts' },
    { key: 'node', title: 'Node' }
  ],
  Deployments: [{ key: 'ready', title: 'Ready' }],
  StatefulSets: [{ key: 'ready', title: 'Ready' }],
  DaemonSets: [{ key: 'ready', title: 'Ready' }],
  ReplicaSets: [{ key: 'ready', title: 'Ready' }],
  ReplicationControllers: [{ key: 'ready', title: 'Ready' }],
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
  Ingresses: [{ key: 'hosts', title: 'Hosts' }],
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
