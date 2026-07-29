import type { VirtualPageKey } from '@shared/types/navigation'

/** Short labels for workspace tabs / menus. */
export const VIRTUAL_PAGE_LABELS: Record<VirtualPageKey, string> = {
  clusterOverview: 'Cluster',
  applications: 'Applications',
  workloadsOverview: 'Workloads',
  configOverview: 'Config',
  topology: 'Topology',
  portForwarding: 'Port Forwarding',
  dynamicCustomResources: 'Custom Resources',
  operatorResources: 'Operators',
  discoveredApiGroups: 'API Groups',
  discoveredApiVersions: 'API Versions',
  helmCharts: 'Helm Charts',
  helmReleases: 'Helm Releases'
}
