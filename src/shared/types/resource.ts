import type { ResourceKind } from '../resourceKinds'

export interface ResourceListItem {
  id: string
  name: string
  namespace: string
  ageTimestamp: string | null
  statusText: string
  statusColor: string
  columns: Record<string, string>
}

export interface ResourceListRequest {
  clusterId: string
  kind: ResourceKind
  namespace: string | 'ALL'
}

export type ResourceListResponse = { items: ResourceListItem[] } | { error: string }

export interface ColumnDef {
  key: string
  title: string
}
