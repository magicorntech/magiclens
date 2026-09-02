import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  Bell,
  Box,
  Boxes,
  Clock,
  Compass,
  Copy,
  Database,
  FileKey,
  FileText,
  Flag,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Link2,
  Lock,
  Network,
  Package,
  PieChart,
  Plug,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tags,
  TrendingUp,
  Webhook,
  Workflow
} from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { Icon } from '../components/ui/Icon'
import { HelmLogo } from './HelmLogo'
import { ArgoLogo } from './ArgoLogo'

function kindIcon(icon: LucideIcon): React.ComponentType {
  return function ResourceKindIcon(): React.JSX.Element {
    return (
      <span className="ml-menu-icon-slot">
        <Icon icon={icon} variant="action" />
      </span>
    )
  }
}

export const kindIcons: Record<ResourceKind, React.ComponentType> = {
  Nodes: kindIcon(Server),
  Namespaces: kindIcon(Layers),
  Pods: kindIcon(Box),
  Deployments: kindIcon(Rocket),
  StatefulSets: kindIcon(Database),
  DaemonSets: kindIcon(Workflow),
  ReplicaSets: kindIcon(Copy),
  ReplicationControllers: kindIcon(GitBranch),
  Jobs: kindIcon(Plug),
  CronJobs: kindIcon(Clock),
  ConfigMaps: kindIcon(FileText),
  Secrets: kindIcon(Lock),
  ResourceQuotas: kindIcon(PieChart),
  LimitRanges: kindIcon(SlidersHorizontal),
  HorizontalPodAutoscalers: kindIcon(TrendingUp),
  PodDisruptionBudgets: kindIcon(Shield),
  PriorityClasses: kindIcon(Flag),
  RuntimeClasses: kindIcon(Package),
  Leases: kindIcon(Key),
  MutatingWebhookConfigurations: kindIcon(Webhook),
  ValidatingWebhookConfigurations: kindIcon(Webhook),
  ValidatingAdmissionPolicies: kindIcon(ShieldCheck),
  ValidatingAdmissionPolicyBindings: kindIcon(Link2),
  Services: kindIcon(Globe),
  EndpointSlices: kindIcon(Network),
  Endpoints: kindIcon(ArrowLeftRight),
  Ingresses: kindIcon(Globe),
  IngressClasses: kindIcon(Tags),
  NetworkPolicies: kindIcon(ShieldCheck),
  PersistentVolumeClaims: kindIcon(HardDrive),
  PersistentVolumes: kindIcon(HardDrive),
  StorageClasses: kindIcon(Database),
  ServiceAccounts: kindIcon(FileKey),
  Roles: kindIcon(ShieldCheck),
  RoleBindings: kindIcon(Link2),
  ClusterRoles: kindIcon(ShieldCheck),
  ClusterRoleBindings: kindIcon(Link2),
  CustomResourceDefinitions: kindIcon(Boxes),
  Events: kindIcon(Bell)
}

export const virtualPageIcons: Record<VirtualPageKey, LucideIcon> = {
  applications: AppWindow,
  workloadsOverview: Activity,
  configOverview: SlidersHorizontal,
  networkOverview: Globe,
  storageOverview: HardDrive,
  topology: Network,
  portForwarding: ArrowLeftRight,
  dynamicCustomResources: Boxes,
  operatorResources: Package,
  discoveredApiGroups: Compass,
  discoveredApiVersions: GitBranch,
  helmCharts: HelmLogo as LucideIcon,
  helmReleases: HelmLogo as LucideIcon,
  argoDashboard: ArgoLogo as LucideIcon,
  argoApplications: ArgoLogo as LucideIcon,
  argoApplicationSets: ArgoLogo as LucideIcon,
  argoProjects: ArgoLogo as LucideIcon,
  argoRepositories: GitBranch,
  argoClusters: Server
}

export const favoriteIcon = Star

function virtualIcon(key: VirtualPageKey): React.ComponentType {
  const lucide = virtualPageIcons[key]
  return function VirtualPageIcon(): React.JSX.Element {
    return (
      <span className="ml-menu-icon-slot">
        <Icon icon={lucide} variant="action" />
      </span>
    )
  }
}

/** Raw Lucide icons for tabs and inline use. */
export const kindIconLucide: Record<ResourceKind, LucideIcon> = {
  Nodes: Server,
  Namespaces: Layers,
  Pods: Box,
  Deployments: Rocket,
  StatefulSets: Database,
  DaemonSets: Workflow,
  ReplicaSets: Copy,
  ReplicationControllers: GitBranch,
  Jobs: Plug,
  CronJobs: Clock,
  ConfigMaps: FileText,
  Secrets: Lock,
  ResourceQuotas: PieChart,
  LimitRanges: SlidersHorizontal,
  HorizontalPodAutoscalers: TrendingUp,
  PodDisruptionBudgets: Shield,
  PriorityClasses: Flag,
  RuntimeClasses: Package,
  Leases: Key,
  MutatingWebhookConfigurations: Webhook,
  ValidatingWebhookConfigurations: Webhook,
  ValidatingAdmissionPolicies: ShieldCheck,
  ValidatingAdmissionPolicyBindings: Link2,
  Services: Globe,
  EndpointSlices: Network,
  Endpoints: ArrowLeftRight,
  Ingresses: Globe,
  IngressClasses: Tags,
  NetworkPolicies: ShieldCheck,
  PersistentVolumeClaims: HardDrive,
  PersistentVolumes: HardDrive,
  StorageClasses: Database,
  ServiceAccounts: FileKey,
  Roles: ShieldCheck,
  RoleBindings: Link2,
  ClusterRoles: ShieldCheck,
  ClusterRoleBindings: Link2,
  CustomResourceDefinitions: Boxes,
  Events: Bell
}

export const virtualPageIconComponents: Record<VirtualPageKey, React.ComponentType> = {
  applications: virtualIcon('applications'),
  workloadsOverview: virtualIcon('workloadsOverview'),
  configOverview: virtualIcon('configOverview'),
  networkOverview: virtualIcon('networkOverview'),
  storageOverview: virtualIcon('storageOverview'),
  topology: virtualIcon('topology'),
  portForwarding: virtualIcon('portForwarding'),
  dynamicCustomResources: virtualIcon('dynamicCustomResources'),
  operatorResources: virtualIcon('operatorResources'),
  discoveredApiGroups: virtualIcon('discoveredApiGroups'),
  discoveredApiVersions: virtualIcon('discoveredApiVersions'),
  helmCharts: virtualIcon('helmCharts'),
  helmReleases: virtualIcon('helmReleases'),
  argoDashboard: virtualIcon('argoDashboard'),
  argoApplications: virtualIcon('argoApplications'),
  argoApplicationSets: virtualIcon('argoApplicationSets'),
  argoProjects: virtualIcon('argoProjects'),
  argoRepositories: virtualIcon('argoRepositories'),
  argoClusters: virtualIcon('argoClusters')
}
