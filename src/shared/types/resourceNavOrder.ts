/** Stable ids for top-level cluster resource-nav items (Favorites stays pinned first). */
export type ResourceNavItemId =
  | 'nodes'
  | 'topology'
  | 'visualizer'
  | 'security'
  | 'workloads'
  | 'config'
  | 'network'
  | 'storage'
  | 'namespaces'
  | 'events'
  | 'timeline'
  | 'helm'
  | 'grafana'
  | 'prometheus'
  | 'argocd'
  | 'access-control'
  | 'custom-resources'

export const DEFAULT_RESOURCE_NAV_ORDER: ResourceNavItemId[] = [
  'nodes',
  'topology',
  'visualizer',
  'security',
  'workloads',
  'config',
  'network',
  'storage',
  'namespaces',
  'events',
  'timeline',
  'helm',
  'grafana',
  'prometheus',
  'argocd',
  'access-control',
  'custom-resources'
]

const KNOWN = new Set<string>(DEFAULT_RESOURCE_NAV_ORDER)

export function normalizeResourceNavOrder(order?: string[] | null): ResourceNavItemId[] {
  const filtered: ResourceNavItemId[] = []
  const seen = new Set<string>()
  for (const raw of order ?? []) {
    if (!KNOWN.has(raw) || seen.has(raw)) continue
    seen.add(raw)
    filtered.push(raw as ResourceNavItemId)
  }
  for (const id of DEFAULT_RESOURCE_NAV_ORDER) {
    if (!seen.has(id)) filtered.push(id)
  }
  return filtered
}
