import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Calendar,
  FolderOpen,
  Globe,
  HardDrive,
  Network,
  Orbit,
  Server,
  Settings,
  Shield,
  Star
} from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'

export type NavEntry =
  | { type: 'kind'; kind: ResourceKind; label?: string }
  | { type: 'virtual'; key: VirtualPageKey; label: string }

export interface NavStandaloneItem {
  type: 'standalone'
  kind: ResourceKind
  icon: LucideIcon
  label?: string
}

export interface NavCollapsibleSection {
  type: 'section'
  id: string
  title: string
  icon: LucideIcon
  entries: NavEntry[]
}

export type NavLayoutItem = 'favorites' | NavStandaloneItem | NavCollapsibleSection

export const FAVORITES_SECTION_ID = 'favorites'

/** Lens-style resource sidebar order and grouping. */
export const resourceNavLayout: NavLayoutItem[] = [
  'favorites',
  { type: 'standalone', kind: 'Nodes', icon: Server },
  {
    type: 'section',
    id: 'overview',
    title: 'Overview',
    icon: Network,
    entries: [{ type: 'virtual', key: 'topology', label: 'Topology' }]
  },
  {
    type: 'section',
    id: 'workloads',
    title: 'Workloads',
    icon: Boxes,
    entries: [
      { type: 'kind', kind: 'Pods' },
      { type: 'kind', kind: 'Deployments' },
      { type: 'kind', kind: 'DaemonSets' },
      { type: 'kind', kind: 'StatefulSets' },
      { type: 'kind', kind: 'ReplicaSets' },
      { type: 'kind', kind: 'ReplicationControllers' },
      { type: 'kind', kind: 'Jobs' },
      { type: 'kind', kind: 'CronJobs' }
    ]
  },
  {
    type: 'section',
    id: 'config',
    title: 'Config',
    icon: Settings,
    entries: [
      { type: 'kind', kind: 'ConfigMaps' },
      { type: 'kind', kind: 'Secrets' },
      { type: 'kind', kind: 'ResourceQuotas' },
      { type: 'kind', kind: 'LimitRanges' },
      { type: 'kind', kind: 'HorizontalPodAutoscalers' },
      { type: 'kind', kind: 'PodDisruptionBudgets' },
      { type: 'kind', kind: 'PriorityClasses' },
      { type: 'kind', kind: 'RuntimeClasses' },
      { type: 'kind', kind: 'Leases' },
      { type: 'kind', kind: 'MutatingWebhookConfigurations' },
      { type: 'kind', kind: 'ValidatingWebhookConfigurations' },
      { type: 'kind', kind: 'ValidatingAdmissionPolicies' },
      { type: 'kind', kind: 'ValidatingAdmissionPolicyBindings' }
    ]
  },
  {
    type: 'section',
    id: 'network',
    title: 'Network',
    icon: Globe,
    entries: [
      { type: 'kind', kind: 'Services' },
      { type: 'kind', kind: 'EndpointSlices' },
      { type: 'kind', kind: 'Endpoints' },
      { type: 'kind', kind: 'Ingresses' },
      { type: 'kind', kind: 'IngressClasses' },
      { type: 'kind', kind: 'NetworkPolicies' },
      { type: 'virtual', key: 'portForwarding', label: 'Port Forwarding' }
    ]
  },
  {
    type: 'section',
    id: 'storage',
    title: 'Storage',
    icon: HardDrive,
    entries: [
      { type: 'kind', kind: 'PersistentVolumeClaims' },
      { type: 'kind', kind: 'PersistentVolumes' },
      { type: 'kind', kind: 'StorageClasses' }
    ]
  },
  { type: 'standalone', kind: 'Namespaces', icon: FolderOpen },
  { type: 'standalone', kind: 'Events', icon: Calendar },
  {
    type: 'section',
    id: 'helm',
    title: 'Helm',
    icon: Orbit,
    entries: [
      { type: 'virtual', key: 'helmCharts', label: 'Charts' },
      { type: 'virtual', key: 'helmReleases', label: 'Releases' }
    ]
  },
  {
    type: 'section',
    id: 'access-control',
    title: 'Access Control',
    icon: Shield,
    entries: [
      { type: 'kind', kind: 'ServiceAccounts' },
      { type: 'kind', kind: 'ClusterRoles' },
      { type: 'kind', kind: 'Roles' },
      { type: 'kind', kind: 'ClusterRoleBindings' },
      { type: 'kind', kind: 'RoleBindings' }
    ]
  },
  {
    type: 'section',
    id: 'custom-resources',
    title: 'Custom Resources',
    icon: Boxes,
    entries: [
      { type: 'kind', kind: 'CustomResourceDefinitions', label: 'Definitions' },
      { type: 'virtual', key: 'operatorResources', label: 'Installed CRDs' },
      { type: 'virtual', key: 'dynamicCustomResources', label: 'Dynamic Resources' }
    ]
  }
]

export const favoritesSectionIcon = Star

export function navEntryKey(entry: NavEntry): string {
  return entry.type === 'kind' ? entry.kind : entry.key
}

export function navEntryLabel(entry: NavEntry): string {
  if (entry.type === 'kind') return entry.label ?? entry.kind
  return entry.label
}

export function findSectionForSelection(
  kind: ResourceKind | null,
  virtualPage: VirtualPageKey | null
): string | null {
  for (const item of resourceNavLayout) {
    if (item === 'favorites' || item.type === 'standalone') continue
    for (const entry of item.entries) {
      if (entry.type === 'kind' && entry.kind === kind) return item.id
      if (entry.type === 'virtual' && entry.key === virtualPage) return item.id
    }
  }
  return null
}

export function flattenNavEntries(): NavEntry[] {
  const entries: NavEntry[] = []
  for (const item of resourceNavLayout) {
    if (item === 'favorites' || item.type === 'standalone') continue
    entries.push(...item.entries)
  }
  return entries
}

export function allVirtualPageKeys(): Set<VirtualPageKey> {
  const keys = new Set<VirtualPageKey>()
  for (const item of resourceNavLayout) {
    if (item === 'favorites' || item.type === 'standalone') continue
    for (const entry of item.entries) {
      if (entry.type === 'virtual') keys.add(entry.key)
    }
  }
  return keys
}
