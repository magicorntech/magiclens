import type { ResourceKind } from '../resourceKinds'

export const GLOBAL_SEARCH_TYPES = [
  'clusters',
  'namespaces',
  'pods',
  'deployments',
  'statefulsets',
  'daemonsets',
  'replicasets',
  'services',
  'ingresses',
  'configmaps',
  'secrets',
  'pvc',
  'pv',
  'nodes',
  'events',
  'helm-releases',
  'crds',
  'custom-resources'
] as const

export type GlobalSearchType = (typeof GLOBAL_SEARCH_TYPES)[number]

export type GlobalSearchResult =
  | {
      type: 'cluster'
      clusterId: string
      clusterName: string
      contextName: string
      status: string
    }
  | {
      type: 'builtin'
      clusterId: string
      clusterName: string
      kind: ResourceKind
      namespace: string
      name: string
      subtitle?: string
    }
  | {
      type: 'helm-release'
      clusterId: string
      clusterName: string
      namespace: string
      name: string
      chartName: string
      status: string
    }
  | {
      type: 'crd'
      clusterId: string
      clusterName: string
      name: string
      kind: string
      group: string
    }
  | {
      type: 'custom-resource'
      clusterId: string
      clusterName: string
      apiVersion: string
      kind: string
      plural: string
      namespace: string
      name: string
      namespaced: boolean
    }
  | {
      type: 'event'
      clusterId: string
      clusterName: string
      namespace: string
      name: string
      reason: string
      message: string
      involvedObjectKind?: string
      involvedObjectName?: string
    }

export interface GlobalSearchGroup {
  type: GlobalSearchType
  label: string
  results: GlobalSearchResult[]
}

export interface GlobalSearchRequest {
  clusterId: string
  clusterName: string
  query: string
  /** When set, only these resource categories are searched. */
  types?: GlobalSearchType[]
  limitPerType?: number
}

export type GlobalSearchResponse =
  | { groups: GlobalSearchGroup[] }
  | { error: string }
