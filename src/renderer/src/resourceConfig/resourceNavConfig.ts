import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  FolderOpen,
  ChartGantt,
  Globe,
  HardDrive,
  Hexagon,
  KeyRound,
  LayoutDashboard,
  Puzzle,
  Waypoints,
  Settings,
  Star
} from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { HelmLogo } from '../icons/HelmLogo'
import { ArgoAppLogo, GrafanaLogo, KubernetesLogo, PrometheusLogo } from '../icons/AppsLogos'

export type NavEntry =
  | { type: 'kind'; kind: ResourceKind; label?: string }
  | { type: 'virtual'; key: VirtualPageKey; label: string }

export interface NavStandaloneItem {
  type: 'standalone'
  kind: ResourceKind
  icon: LucideIcon
  label?: string
}

/** A virtual page promoted to a top-level nav item (no section, no resource-kind context menu). */
export interface NavStandaloneVirtualItem {
  type: 'standalone-virtual'
  key: VirtualPageKey
  icon: LucideIcon
  label: string
}

export interface NavCollapsibleSection {
  type: 'section'
  id: string
  title: string
  icon: LucideIcon
  entries: NavEntry[]
}

export type NavLayoutItem =
  | 'favorites'
  | NavStandaloneItem
  | NavStandaloneVirtualItem
  | NavCollapsibleSection

export const FAVORITES_SECTION_ID = 'favorites'

/** Lens-style resource sidebar order and grouping. */
export const resourceNavLayout: NavLayoutItem[] = [
  'favorites',
  { type: 'standalone', kind: 'Nodes', icon: KubernetesLogo as LucideIcon },
  { type: 'standalone-virtual', key: 'topology', icon: LayoutDashboard, label: 'Topology' },
  { type: 'standalone-virtual', key: 'visualizer', icon: Waypoints, label: 'Visualizer' },
  {
    type: 'section',
    id: 'workloads',
    title: 'Workloads',
    icon: Hexagon,
    entries: [
      { type: 'virtual', key: 'workloadsOverview', label: 'Overview' },
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
      { type: 'virtual', key: 'configOverview', label: 'Overview' },
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
      { type: 'virtual', key: 'networkOverview', label: 'Overview' },
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
      { type: 'virtual', key: 'storageOverview', label: 'Overview' },
      { type: 'kind', kind: 'PersistentVolumeClaims' },
      { type: 'kind', kind: 'PersistentVolumes' },
      { type: 'kind', kind: 'StorageClasses' }
    ]
  },
  { type: 'standalone', kind: 'Namespaces', icon: FolderOpen },
  { type: 'standalone', kind: 'Events', icon: Calendar },
  { type: 'standalone-virtual', key: 'eventTimeline', icon: ChartGantt, label: 'Timeline' },
  { type: 'standalone-virtual', key: 'helmCharts', icon: HelmLogo as LucideIcon, label: 'Helm' },
  { type: 'standalone-virtual', key: 'appGrafana', icon: GrafanaLogo as LucideIcon, label: 'Grafana' },
  { type: 'standalone-virtual', key: 'appPrometheus', icon: PrometheusLogo as LucideIcon, label: 'Prometheus' },
  {
    type: 'section',
    id: 'argocd',
    title: 'Argo CD',
    icon: ArgoAppLogo as LucideIcon,
    entries: [
      { type: 'virtual', key: 'appArgoCd', label: 'Web UI' },
      { type: 'virtual', key: 'argoDashboard', label: 'Dashboard' },
      { type: 'virtual', key: 'argoApplications', label: 'Applications' },
      { type: 'virtual', key: 'argoApplicationSets', label: 'Application Sets' },
      { type: 'virtual', key: 'argoProjects', label: 'Projects' },
      { type: 'virtual', key: 'argoRepositories', label: 'Repositories' },
      { type: 'virtual', key: 'argoClusters', label: 'Clusters' }
    ]
  },
  {
    type: 'section',
    id: 'access-control',
    title: 'Access Control',
    icon: KeyRound,
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
    icon: Puzzle,
    entries: [
      { type: 'virtual', key: 'dynamicCustomResources', label: 'Custom Resources' },
      { type: 'kind', kind: 'CustomResourceDefinitions', label: 'Definitions' }
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
    if (item === 'favorites' || item.type === 'standalone' || item.type === 'standalone-virtual') continue
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
    if (item === 'favorites' || item.type === 'standalone' || item.type === 'standalone-virtual') continue
    entries.push(...item.entries)
  }
  return entries
}

export function allVirtualPageKeys(): Set<VirtualPageKey> {
  const keys = new Set<VirtualPageKey>()
  for (const item of resourceNavLayout) {
    if (item === 'favorites' || item.type === 'standalone') continue
    if (item.type === 'standalone-virtual') {
      keys.add(item.key)
      continue
    }
    for (const entry of item.entries) {
      if (entry.type === 'virtual') keys.add(entry.key)
    }
  }
  return keys
}
