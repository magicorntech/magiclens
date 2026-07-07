import type { ResourceMutationTarget } from './resourceMutation'

export interface ResourceEventsRequest {
  clusterId: string
  namespace: string
  name: string
  target: ResourceMutationTarget
}

export interface ResourceEventItem {
  id: string
  type: string
  reason: string
  message: string
  count: number
  firstTimestamp: string | null
  lastTimestamp: string | null
  source: string
}

export type ResourceEventsResponse = { events: ResourceEventItem[] } | { error: string }

export interface ClusterEventsRequest {
  clusterId: string
  limit?: number
  involvedObjectKind?: string
  involvedObjectName?: string
}
