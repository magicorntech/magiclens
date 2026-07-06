import type { ResourceKind } from '../resourceKinds'
import type { DynamicResourceItem } from './discovery'
import type { ResourceListItem } from './resource'

/**
 * Live status of a resource watch session, surfaced in the UI so the user always knows whether
 * the table is streaming real-time updates or has fallen back to polling.
 */
export type ResourceWatchStatus =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'fallback-polling'
  | 'disconnected'
  | 'error'

export type ResourceWatchTarget =
  | { type: 'builtin'; kind: ResourceKind }
  | { type: 'dynamic'; apiVersion: string; kind: string; plural: string; namespaced: boolean }

export interface ResourceWatchStartRequest {
  sessionId: string
  clusterId: string
  namespace: string | 'ALL'
  target: ResourceWatchTarget
}

export interface ResourceWatchSessionRequest {
  sessionId: string
}

export type ResourceWatchStartResponse = { ok: true } | { error: string }

export type ResourceWatchOp =
  | { op: 'upsert'; item: ResourceListItem | DynamicResourceItem }
  | { op: 'delete'; id: string }

export interface ResourceWatchEventPayload {
  sessionId: string
  changes: ResourceWatchOp[]
}

export interface ResourceWatchStatusPayload {
  sessionId: string
  status: ResourceWatchStatus
  error?: string
}
