export interface ClusterGroup {
  id: string
  name: string
  clusterIds: string[]
  /** UI preference — collapsed in sidebar */
  collapsed?: boolean
}

export type ClusterGroupsState = ClusterGroup[]
