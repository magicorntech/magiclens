import type { ResourceKind } from '@shared/resourceKinds'

export interface ResourceTabPreferences {
  pinned: ResourceKind[]
  favorites: ResourceKind[]
  splitView: boolean
  splitLeftKind: ResourceKind | null
  splitRightKind: ResourceKind | null
  focusedSplitPane: 'left' | 'right'
}

const STORAGE_PREFIX = 'ml-resource-tabs:'

export const defaultResourceTabPreferences = (): ResourceTabPreferences => ({
  pinned: [],
  favorites: [],
  splitView: false,
  splitLeftKind: null,
  splitRightKind: null,
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
