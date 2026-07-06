/** One concrete Kubernetes resource type as reported by the cluster's own Discovery API
 * (GET /api/v1, GET /apis/{group}/{version}) — never hardcoded, always read live from the cluster. */
export interface DiscoveredApiResource {
  group: string
  version: string
  apiVersion: string
  kind: string
  name: string
  singularName: string
  namespaced: boolean
  verbs: string[]
  shortNames: string[]
  categories: string[]
}

export interface DiscoveredApiGroupVersion {
  groupVersion: string
  version: string
}

export interface DiscoveredApiGroup {
  name: string
  versions: DiscoveredApiGroupVersion[]
  preferredVersion: string
}

export interface DiscoveryResponse {
  groups: DiscoveredApiGroup[]
  resources: DiscoveredApiResource[]
}

export interface DiscoveryRequest {
  clusterId: string
  /** Bypass the in-memory cache and re-query the cluster's Discovery API. */
  refresh?: boolean
}

/** A resource kind backed by a CustomResourceDefinition — read live from CRD objects, so
 * anything installed by an operator or `kubectl apply -f crd.yaml` shows up automatically. */
export interface CustomResourceKind {
  group: string
  version: string
  apiVersion: string
  kind: string
  plural: string
  singular: string
  namespaced: boolean
  shortNames: string[]
  categories: string[]
  crdName: string
  /** Populated only by the "installed operator resources" listing, which probes each kind. */
  instanceCount?: number
}

export interface CustomResourceKindsRequest {
  clusterId: string
  /** When true, only kinds with at least one live instance are returned (probes each kind). */
  onlyWithInstances?: boolean
}

export type CustomResourceKindsResponse = { kinds: CustomResourceKind[] } | { error: string }

export interface DynamicResourceListRequest {
  clusterId: string
  apiVersion: string
  kind: string
  namespaced: boolean
  namespace: string | 'ALL'
}

export interface DynamicResourceItem {
  id: string
  name: string
  namespace: string
  ageTimestamp: string | null
  labelKeys: string[]
}

export type DynamicResourceListResponse = { items: DynamicResourceItem[] } | { error: string }
