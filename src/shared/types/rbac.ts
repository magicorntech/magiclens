import type { ClusterIdRequest } from './cluster'
import type { ResourceMutationTarget } from './resourceMutation'

export type RbacVerb = 'get' | 'list' | 'create' | 'update' | 'patch' | 'delete'

export interface RbacCanIRequest extends ClusterIdRequest {
  target: ResourceMutationTarget
  namespace: string
  name?: string
  verb: RbacVerb
  /** e.g. "scale" for deployments/scale subresource checks */
  subresource?: string
}

export interface RbacCanIResponse {
  allowed: boolean
  reason?: string
  /** SSAR request failed (network/auth API) — not an explicit RBAC denial. */
  ssarError?: boolean
}

export interface ResourcePermissionsRequest extends ClusterIdRequest {
  target: ResourceMutationTarget
  namespace: string
  name: string
}

export interface ResourcePermissionsResponse {
  canGet: boolean
  canUpdate: boolean
  canPatch: boolean
  canDelete: boolean
  canScale: boolean
  canDeletePods: boolean
  /** Create Jobs in namespace (rerun / manual CronJob trigger). */
  canCreateJobs: boolean
  /** False when SSAR could not be evaluated (e.g. cluster client missing). */
  verified: boolean
}
