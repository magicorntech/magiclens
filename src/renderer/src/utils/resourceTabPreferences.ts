import type { ResourceKind } from '@shared/resourceKinds'

export interface ResourceTabPreferences {
  pinned: ResourceKind[]
  favorites: ResourceKind[]
  /**
   * Display order across BOTH resource-kind tabs and virtual-page tabs, as `kind:X` /
   * `virtual:X` ids. Needed because the two live in separate store arrays with no
   * interleaving information, which previously pinned every virtual page to the far left.
   * Empty on first run — see `mergeTabOrder` for the fallback.
   */
  tabOrder: string[]
  splitView: boolean
  splitLeftKind: ResourceKind | null
  splitRightKind: ResourceKind | null
  /** Per-pane namespace while resource tabs are split (falls back to cluster namespace). */
  splitLeftNamespace: string | null
  splitRightNamespace: string | null
  focusedSplitPane: 'left' | 'right'
}

const STORAGE_PREFIX = 'ml-resource-tabs:'

export const defaultResourceTabPreferences = (): ResourceTabPreferences => ({
  pinned: [],
  favorites: [],
  tabOrder: [],
  splitView: false,
  splitLeftKind: null,
  splitRightKind: null,
  splitLeftNamespace: null,
  splitRightNamespace: null,
  focusedSplitPane: 'left'
})

export function loadResourceTabPreferences(clusterId: string): ResourceTabPreferences {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${clusterId}`)
    if (!raw) return defaultResourceTabPreferences()
    const parsed = JSON.parse(raw) as Partial<ResourceTabPreferences>
    return { ...defaultResourceTabPreferences(), ...parsed }
  } catch {
    return defaultResourceTabPreferences()
  }
}

export function saveResourceTabPreferences(clusterId: string, prefs: ResourceTabPreferences): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${clusterId}`, JSON.stringify(prefs))
    window.dispatchEvent(new CustomEvent('ml-resource-tabs-changed', { detail: { clusterId } }))
  } catch {
    // ignore quota errors
  }
}

/** Stable id for a tab in the merged (kinds + virtual pages) ordering. */
export function kindTabId(kind: string): string {
  return `kind:${kind}`
}

export function virtualTabId(page: string): string {
  return `virtual:${page}`
}

/**
 * Applies the saved cross-type order to the currently-open tabs. Ids missing from
 * `savedOrder` (newly opened tabs, or every tab before this preference existed) keep their
 * incoming relative order and land at the end, so nothing disappears and the first run
 * degrades to the previous behaviour instead of shuffling.
 */
export function mergeTabOrder(openIds: string[], savedOrder: string[]): string[] {
  const open = new Set(openIds)
  const ordered = savedOrder.filter((id) => open.has(id))
  const seen = new Set(ordered)
  return [...ordered, ...openIds.filter((id) => !seen.has(id))]
}

/** Pinned tabs first, then the rest — preserves relative order within each group. */
export function sortResourceKinds(
  kinds: ResourceKind[],
  pinned: ResourceKind[]
): ResourceKind[] {
  const pinnedSet = new Set(pinned)
  const pinnedOrdered = pinned.filter((k) => kinds.includes(k))
  const rest = kinds.filter((k) => !pinnedSet.has(k))
  return [...pinnedOrdered, ...rest]
}
