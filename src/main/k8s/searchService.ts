import type { ResourceKind } from '@shared/resourceKinds'
import type { GlobalSearchGroup, GlobalSearchRequest, GlobalSearchResult, GlobalSearchType } from '@shared/types/search'
import { GLOBAL_SEARCH_TYPE_LABELS } from '@shared/globalSearchKeywords'
import { GLOBAL_SEARCH_TYPES } from '@shared/types/search'
import { matchesSearchText } from '@shared/globalSearchKeywords'
import type { ClusterClients } from './clusterManager'
import { listCustomResourceKinds } from './customResourceService'
import { listDynamicResources } from './dynamicResourceService'
import { listRecentClusterEvents } from './eventsService'
import { listHelmReleases } from './helmService'
import { resourceRegistry } from './resourceRegistry'

const DEFAULT_LIMIT = 15

const BUILTIN_KIND_MAP: Partial<Record<GlobalSearchType, ResourceKind>> = {
  namespaces: 'Namespaces',
  pods: 'Pods',
  deployments: 'Deployments',
  statefulsets: 'StatefulSets',
  daemonsets: 'DaemonSets',
  replicasets: 'ReplicaSets',
  services: 'Services',
  ingresses: 'Ingresses',
  configmaps: 'ConfigMaps',
  secrets: 'Secrets',
  pvc: 'PersistentVolumeClaims',
  pv: 'PersistentVolumes',
  nodes: 'Nodes',
  events: 'Events',
  crds: 'CustomResourceDefinitions'
}

const RESOURCE_SEARCH_TYPES = Object.keys(BUILTIN_KIND_MAP) as GlobalSearchType[]

function pushResults(
  groups: Map<GlobalSearchType, GlobalSearchResult[]>,
  type: GlobalSearchType,
  results: GlobalSearchResult[]
): void {
  if (results.length === 0) return
  const existing = groups.get(type) ?? []
  groups.set(type, [...existing, ...results])
}

async function searchBuiltinKind(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  searchType: GlobalSearchType,
  kind: ResourceKind,
  text: string,
  limit: number
): Promise<GlobalSearchResult[]> {
  try {
    const items = await resourceRegistry[kind].list(clients, 'ALL')
    const results: GlobalSearchResult[] = []
    for (const item of items) {
      if (!matchesSearchText(item.name, text) && !matchesSearchText(item.namespace, text)) continue
      results.push({
        type: 'builtin',
        clusterId,
        clusterName,
        kind,
        namespace: item.namespace,
        name: item.name,
        subtitle: item.statusText || undefined
      })
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

async function searchEvents(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  text: string,
  limit: number
): Promise<GlobalSearchResult[]> {
  try {
    const events = await listRecentClusterEvents(clients, { limit: 200 })
    const results: GlobalSearchResult[] = []
    for (const event of events) {
      const haystacks = [event.reason, event.message, event.source]
      if (!haystacks.some((h) => matchesSearchText(h, text))) continue
      const parts = event.id.split('/')
      results.push({
        type: 'event',
        clusterId,
        clusterName,
        namespace: parts.length > 1 ? parts[0] : '',
        name: parts.length > 1 ? parts[1] : event.id,
        reason: event.reason,
        message: event.message
      })
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

async function searchHelmReleases(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  text: string,
  limit: number
): Promise<GlobalSearchResult[]> {
  try {
    const releases = await listHelmReleases(clients)
    const results: GlobalSearchResult[] = []
    for (const release of releases) {
      const haystacks = [release.name, release.namespace, release.chartName, release.status]
      if (!haystacks.some((h) => matchesSearchText(h, text))) continue
      results.push({
        type: 'helm-release',
        clusterId,
        clusterName,
        namespace: release.namespace,
        name: release.name,
        chartName: release.chartName,
        status: release.status
      })
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

async function searchCrds(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  text: string,
  limit: number
): Promise<GlobalSearchResult[]> {
  try {
    const kinds = await listCustomResourceKinds(clients, false)
    const results: GlobalSearchResult[] = []
    for (const kind of kinds) {
      const haystacks = [kind.crdName, kind.kind, kind.group, kind.plural, ...kind.shortNames]
      if (!haystacks.some((h) => matchesSearchText(h, text))) continue
      results.push({
        type: 'crd',
        clusterId,
        clusterName,
        name: kind.crdName,
        kind: kind.kind,
        group: kind.group
      })
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

async function searchCustomResources(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  text: string,
  limit: number
): Promise<GlobalSearchResult[]> {
  try {
    const kinds = await listCustomResourceKinds(clients, true)
    const matchingKinds = kinds
      .filter((k) => {
        if (!text.trim()) return true
        const haystacks = [k.kind, k.plural, k.group, k.crdName, ...k.shortNames]
        return haystacks.some((h) => matchesSearchText(h, text))
      })
      .slice(0, 4)

    const results: GlobalSearchResult[] = []
    for (const kind of matchingKinds) {
      const items = await listDynamicResources(clients, kind.apiVersion, kind.kind, kind.namespaced, 'ALL')
      for (const item of items) {
        if (!matchesSearchText(item.name, text) && !matchesSearchText(item.namespace, text)) continue
        results.push({
          type: 'custom-resource',
          clusterId,
          clusterName,
          apiVersion: kind.apiVersion,
          kind: kind.kind,
          plural: kind.plural,
          namespace: item.namespace,
          name: item.name,
          namespaced: kind.namespaced
        })
        if (results.length >= limit) break
      }
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

export async function searchClusterResources(
  clients: ClusterClients,
  clusterId: string,
  clusterName: string,
  req: GlobalSearchRequest
): Promise<GlobalSearchGroup[]> {
  const limit = req.limitPerType ?? DEFAULT_LIMIT
  const types = new Set(req.types?.length ? req.types : [...RESOURCE_SEARCH_TYPES, 'helm-releases', 'custom-resources'])
  const text = req.query.trim()
  const groups = new Map<GlobalSearchType, GlobalSearchResult[]>()

  const tasks: Promise<void>[] = []

  for (const searchType of RESOURCE_SEARCH_TYPES) {
    if (!types.has(searchType)) continue
    const kind = BUILTIN_KIND_MAP[searchType]
    if (!kind) continue

    if (searchType === 'events') {
      tasks.push(
        searchEvents(clients, clusterId, clusterName, text, limit).then((results) =>
          pushResults(groups, searchType, results)
        )
      )
      continue
    }

    if (searchType === 'crds') {
      tasks.push(
        searchCrds(clients, clusterId, clusterName, text, limit).then((results) =>
          pushResults(groups, searchType, results)
        )
      )
      continue
    }

    tasks.push(
      searchBuiltinKind(clients, clusterId, clusterName, searchType, kind, text, limit).then((results) =>
        pushResults(groups, searchType, results)
      )
    )
  }

  if (types.has('helm-releases')) {
    tasks.push(
      searchHelmReleases(clients, clusterId, clusterName, text, limit).then((results) =>
        pushResults(groups, 'helm-releases', results)
      )
    )
  }

  if (types.has('custom-resources')) {
    tasks.push(
      searchCustomResources(clients, clusterId, clusterName, text, limit).then((results) =>
        pushResults(groups, 'custom-resources', results)
      )
    )
  }

  await Promise.all(tasks)

  return GLOBAL_SEARCH_TYPES.filter((type) => groups.has(type)).map((type) => ({
    type,
    label: GLOBAL_SEARCH_TYPE_LABELS[type],
    results: groups.get(type) ?? []
  }))
}
