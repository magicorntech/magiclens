import type { ResourceKind } from '../resourceKinds'

export type ResourceMutationTarget =
  | { type: 'builtin'; kind: ResourceKind }
  | { type: 'dynamic'; apiVersion: string; kind: string; plural: string; namespaced: boolean }

export interface ResourceGetManifestRequest {
  clusterId: string
  namespace: string
  name: string
  target: ResourceMutationTarget
}

export type ResourceGetManifestResponse = { yaml: string } | { error: string }

export interface ResourceApplyManifestRequest {
  clusterId: string
  /** The full, possibly-edited manifest as YAML. apiVersion/kind/metadata.name/metadata.namespace
   * are read from the document itself. */
  yaml: string
}

export interface AppliedResourceRef {
  apiVersion: string
  kind: string
  name: string
  namespace: string
}

export type ResourceApplyManifestResponse = { yaml: string; ref: AppliedResourceRef } | { error: string }

export interface ResourceCreateManifestRequest {
  clusterId: string
  /** One or more `---`-separated YAML documents to create. */
  yaml: string
}

export type ResourceCreateManifestResponse = { created: AppliedResourceRef[] } | { error: string; created: AppliedResourceRef[] }

export interface ResourceDeleteRequest {
  clusterId: string
  namespace: string
  name: string
  target: ResourceMutationTarget
}

export type ResourceDeleteResponse = { ok: true } | { error: string }
