import type { VirtualPageKey } from '@shared/types/navigation'

/** Short labels for workspace tabs / menus. */
export const VIRTUAL_PAGE_LABELS: Record<VirtualPageKey, string> = {
  applications: 'Applications',
  workloadsOverview: 'Workloads',
  configOverview: 'Config',
  networkOverview: 'Network',
  storageOverview: 'Storage',
  topology: 'Topology',
  visualizer: 'Visualizer',
  eventTimeline: 'Timeline',
  portForwarding: 'Port Forwarding',
  dynamicCustomResources: 'Custom Resources',
  operatorResources: 'Custom Resources',
  discoveredApiGroups: 'API Groups',
  discoveredApiVersions: 'API Versions',
  helmCharts: 'Helm',
  helmReleases: 'Helm',
  argoDashboard: 'Argo CD Dashboard',
  argoApplications: 'Argo Applications',
  argoApplicationSets: 'Argo Application Sets',
  argoProjects: 'Argo Projects',
  argoRepositories: 'Argo Repositories',
  argoClusters: 'Argo Clusters',
  appArgoCd: 'Argo CD UI',
  appPrometheus: 'Prometheus',
  appGrafana: 'Grafana'
}
