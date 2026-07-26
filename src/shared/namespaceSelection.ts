/** Sentinel for cluster-wide (all namespaces) selection. */
export const ALL_NAMESPACES = 'ALL'

/** Persisted value when no namespace is selected (empty multi-select). */
export const NO_NAMESPACE_SELECTION = ''

/**
 * Parse persisted / store selection.
 * Multi-select is stored as comma-joined names (safe: K8s ns names are DNS-1123, no commas).
 * Empty string → no selection (show no namespaced resources).
 */
export function parseNamespaceSelection(raw: string | null | undefined): string[] {
  if (raw === null || raw === undefined) return [ALL_NAMESPACES]
  if (raw === NO_NAMESPACE_SELECTION) return []
  if (raw === ALL_NAMESPACES) return [ALL_NAMESPACES]
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.includes(ALL_NAMESPACES)) return [ALL_NAMESPACES]
  return [...new Set(parts)]
}

export function serializeNamespaceSelection(namespaces: string[]): string {
  const cleaned = [...new Set(namespaces.map((s) => s.trim()).filter(Boolean))]
  if (cleaned.length === 0) return NO_NAMESPACE_SELECTION
  if (cleaned.includes(ALL_NAMESPACES)) return ALL_NAMESPACES
  return cleaned.join(',')
}

/** Nothing selected — lists should stay empty / not fetch. */
export function isNoNamespaceSelection(selection: string | string[]): boolean {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  return arr.length === 0
}

export function isAllNamespaces(selection: string | string[]): boolean {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  return arr.includes(ALL_NAMESPACES)
}

export function isMultiNamespace(selection: string | string[]): boolean {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  return !isAllNamespaces(arr) && !isNoNamespaceSelection(arr) && arr.length > 1
}

/** Shows the Namespace column (ALL or multi). */
export function showsNamespaceColumn(selection: string | string[]): boolean {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  return isAllNamespaces(arr) || arr.length > 1
}

/**
 * Value for K8s list/watch APIs: single ns, ALL when all/multi, or null when nothing selected.
 * (multi is filtered client-side after a cluster-wide list).
 */
export function listNamespaceParam(selection: string | string[]): string | 'ALL' | null {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  if (arr.length === 0) return null
  if (isAllNamespaces(arr) || arr.length > 1) return ALL_NAMESPACES
  return arr[0] ?? null
}

export function filterItemsByNamespaceSelection<T extends { namespace?: string }>(
  items: T[],
  selection: string | string[]
): T[] {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  if (arr.length === 0) return []
  if (isAllNamespaces(arr) || arr.length <= 1) return items
  const set = new Set(arr)
  return items.filter((item) => !!item.namespace && set.has(item.namespace))
}

/** First concrete namespace — for topology/create templates that need one ns. */
export function primaryNamespace(selection: string | string[]): string {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  if (arr.length === 0) return NO_NAMESPACE_SELECTION
  if (isAllNamespaces(arr)) return ALL_NAMESPACES
  return arr[0] ?? NO_NAMESPACE_SELECTION
}

export function formatNamespaceSelectionLabel(
  selection: string | string[],
  allLabel: string
): string {
  const arr = typeof selection === 'string' ? parseNamespaceSelection(selection) : selection
  if (arr.length === 0) return ''
  if (isAllNamespaces(arr)) return allLabel
  if (arr.length === 1) return arr[0]
  return `${arr[0]} +${arr.length - 1}`
}

/** Ant Select multiple: ALL is exclusive with concrete namespaces; empty is allowed. */
export function normalizeNamespaceSelect(previous: string[], incoming: string[]): string[] {
  const prevSet = new Set(previous)
  const added = incoming.filter((v) => !prevSet.has(v))
  if (added.includes(ALL_NAMESPACES)) return [ALL_NAMESPACES]
  return incoming.filter((v) => v !== ALL_NAMESPACES)
}
