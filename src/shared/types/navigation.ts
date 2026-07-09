import type { ResourceKind } from '@shared/resourceKinds'

export type VirtualPageKey =
  | 'portForwarding'
  | 'dynamicCustomResources'
  | 'operatorResources'
  | 'discoveredApiGroups'
  | 'discoveredApiVersions'
  | 'helmCharts'
  | 'helmReleases'

export interface ResourceFocus {
  kind: ResourceKind
  namespace: string
  name: string
}

export interface HelmReleaseFocus {
  namespace: string
  name: string
}

export interface DynamicResourceFocus {
  apiVersion: string
  kind: string
  plural: string
  namespace: string
  name: string
  namespaced: boolean
}

export interface PendingNavigation {
  virtualPage?: VirtualPageKey
  helmRelease?: HelmReleaseFocus
  dynamicResource?: DynamicResourceFocus
}
