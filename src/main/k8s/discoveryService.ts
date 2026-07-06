import type { V1APIResource } from '@kubernetes/client-node'
import type { DiscoveredApiGroup, DiscoveredApiResource, DiscoveryResponse } from '@shared/types/discovery'
import type { ClusterClients } from './clusterManager'

interface CacheEntry {
  data: DiscoveryResponse
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000

/** Subresources (pods/status, deployments/scale, ...) aren't independently listable collections,
 * and anything without "list" isn't browsable as a table — both are filtered out of discovery. */
function isListableResource(r: V1APIResource): boolean {
  return !r.name.includes('/') && (r.verbs ?? []).includes('list')
}

async function discoverGroupVersion(
  clients: ClusterClients,
  group: string,
  version: string
): Promise<DiscoveredApiResource[]> {
  try {
    const list =
      group === '' ? await clients.core.getAPIResources() : await clients.customObjects.getAPIResources({ group, version })
    const apiVersion = group === '' ? version : `${group}/${version}`
    return (list.resources ?? []).filter(isListableResource).map((r) => ({
      group,
      version,
      apiVersion,
      kind: r.kind,
      name: r.name,
      singularName: r.singularName || r.name,
      namespaced: r.namespaced,
      verbs: r.verbs ?? [],
      shortNames: r.shortNames ?? [],
      categories: r.categories ?? []
    }))
  } catch {
    // A single misbehaving/aggregated API service (common with API aggregation layers like
    // metrics-server or custom API servers) shouldn't take down discovery for everything else.
    return []
  }
}

/** Reads the cluster's own Discovery API (GET /api, GET /apis/{group}/{version}) instead of any
 * hardcoded resource list, so CRDs, operator-installed types, and future Kubernetes versions all
 * show up automatically without a code change. */
export async function discoverApiResources(
  clusterId: string,
  clients: ClusterClients,
  refresh = false
): Promise<DiscoveryResponse> {
  const cached = cache.get(clusterId)
  if (!refresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const groups: DiscoveredApiGroup[] = []

  const [coreVersions, apiGroupList] = await Promise.all([
    clients.coreApiRoot.getAPIVersions(),
    clients.apisRoot.getAPIVersions()
  ])

  const coreVersionList = coreVersions.versions?.length ? coreVersions.versions : ['v1']
  groups.push({
    name: '',
    versions: coreVersionList.map((v) => ({ groupVersion: v, version: v })),
    preferredVersion: coreVersionList[0] ?? 'v1'
  })

  for (const group of apiGroupList.groups ?? []) {
    groups.push({
      name: group.name,
      versions: (group.versions ?? []).map((v) => ({ groupVersion: v.groupVersion, version: v.version })),
      preferredVersion: group.preferredVersion?.version ?? group.versions?.[0]?.version ?? ''
    })
  }

  const groupVersionPairs: { group: string; version: string }[] = groups.flatMap((g) =>
    g.versions.map((v) => ({ group: g.name, version: v.version }))
  )

  const resourceLists = await Promise.all(
    groupVersionPairs.map(({ group, version }) => discoverGroupVersion(clients, group, version))
  )

  const data: DiscoveryResponse = { groups, resources: resourceLists.flat() }
  cache.set(clusterId, { data, fetchedAt: Date.now() })
  return data
}

export function clearDiscoveryCache(clusterId: string): void {
  cache.delete(clusterId)
}
