import type { GlobalSearchType } from './types/search'

export const GLOBAL_SEARCH_TYPE_LABELS: Record<GlobalSearchType, string> = {
  clusters: 'Clusters',
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
  pvc: 'PVC',
  pv: 'PV',
  nodes: 'Nodes',
  events: 'Events',
  'helm-releases': 'Helm Releases',
  crds: 'CRDs',
  'custom-resources': 'Custom Resources'
}

/** Keywords / aliases for filtering by resource type in the search box (e.g. `pod:nginx`, `@deploy api`). */
export const GLOBAL_SEARCH_TYPE_KEYWORDS: Record<GlobalSearchType, string[]> = {
  clusters: ['cluster', 'clusters', 'cls'],
  namespaces: ['ns', 'namespace', 'namespaces'],
  pods: ['pod', 'pods'],
  deployments: ['deploy', 'deployment', 'deployments', 'dep'],
  statefulsets: ['sts', 'statefulset', 'statefulsets'],
  daemonsets: ['ds', 'daemonset', 'daemonsets'],
  replicasets: ['rs', 'replicaset', 'replicasets'],
  services: ['svc', 'service', 'services'],
  ingresses: ['ing', 'ingress', 'ingresses'],
  configmaps: ['cm', 'configmap', 'configmaps'],
  secrets: ['secret', 'secrets'],
  pvc: ['pvc', 'persistentvolumeclaim', 'persistentvolumeclaims', 'claim', 'claims'],
  pv: ['pv', 'persistentvolume', 'persistentvolumes', 'volume', 'volumes'],
  nodes: ['node', 'nodes'],
  events: ['event', 'events', 'evt'],
  'helm-releases': ['helm', 'release', 'releases'],
  crds: ['crd', 'crds', 'customresourcedefinition', 'customresourcedefinitions'],
  'custom-resources': ['cr', 'custom', 'customresource', 'customresources']
}

const keywordToType = new Map<string, GlobalSearchType>()
for (const [type, keywords] of Object.entries(GLOBAL_SEARCH_TYPE_KEYWORDS) as [GlobalSearchType, string[]][]) {
  for (const kw of keywords) {
    keywordToType.set(kw.toLowerCase(), type)
  }
}

export function resolveSearchTypeKeyword(token: string): GlobalSearchType | null {
  return keywordToType.get(token.toLowerCase()) ?? null
}

export interface ParsedGlobalSearchQuery {
  types: GlobalSearchType[] | null
  text: string
}

export function parseGlobalSearchQuery(
  raw: string,
  chipFilter: GlobalSearchType | null
): ParsedGlobalSearchQuery {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { types: chipFilter ? [chipFilter] : null, text: '' }
  }

  const colonMatch = trimmed.match(/^@?([a-z][\w-]*)\s*:\s*(.*)$/i)
  if (colonMatch) {
    const resolved = resolveSearchTypeKeyword(colonMatch[1])
    if (resolved) return { types: [resolved], text: colonMatch[2].trim() }
  }

  const spaceParts = trimmed.split(/\s+/)
  if (spaceParts.length > 1) {
    const resolved = resolveSearchTypeKeyword(spaceParts[0].replace(/^@/, ''))
    if (resolved) {
      return { types: [resolved], text: spaceParts.slice(1).join(' ') }
    }
  }

  const singleResolved = resolveSearchTypeKeyword(trimmed.replace(/^@/, ''))
  if (singleResolved && !trimmed.includes(' ')) {
    return { types: [singleResolved], text: '' }
  }

  if (chipFilter) return { types: [chipFilter], text: trimmed }
  return { types: null, text: trimmed }
}

export function matchesSearchText(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}
