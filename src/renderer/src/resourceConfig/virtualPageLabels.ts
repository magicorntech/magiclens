import type { VirtualPageKey } from '@shared/types/navigation'

/** Short labels for workspace tabs / menus. */
export const VIRTUAL_PAGE_LABELS: Record<VirtualPageKey, string> = {
  applications: 'Applications',
  workloadsOverview: 'Workloads',
  configOverview: 'Config',
  networkOverview: 'Network',
  storageOverview: 'Storage',
  topology: 'Topology',
  portForwarding: 'Port Forwarding',
  dynamicCustomResources: 'Custom Resources',
  operatorResources: 'Operators',
  discoveredApiGroups: 'API Groups',
  discoveredApiVersions: 'API Versions',
  helmCharts: 'Helm Charts',
  helmReleases: 'Helm Releases',
  argoDashboard: 'Argo CD Dashboard',
  argoApplications: 'Argo Applications',
  argoApplicationSets: 'Argo Application Sets',
  argoProjects: 'Argo Projects',
  argoRepositories: 'Argo Repositories',
  argoClusters: 'Argo Clusters'
}
