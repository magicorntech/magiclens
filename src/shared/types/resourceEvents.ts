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
  involvedKind: string
  involvedName: string
  involvedNamespace: string
  /** Kubernetes Event object name, used to recover the resource when involvedObject is empty. */
  eventName?: string
}

export type ResourceEventsResponse = { events: ResourceEventItem[] } | { error: string }

export interface ClusterEventsRequest {
  clusterId: string
  limit?: number
  involvedObjectKind?: string
  involvedObjectName?: string
  /** Single namespace → GET /api/v1/namespaces/{ns}/events */
  namespace?: string
  /** When set, fetch each namespace separately instead of cluster-wide /api/v1/events. */
  namespaces?: string[]
}
