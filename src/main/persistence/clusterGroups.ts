import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { ClusterGroup, ClusterGroupsState } from '@shared/types/clusterGroup'
import { normalizeGroupShortcut } from '@shared/types/clusterGroup'
import { getSessionScope } from './sessionScope'

interface StoreSchema {
  scopes?: Record<string, ClusterGroupsState>
}

const store = new Store<StoreSchema>({
  name: 'cluster-groups',
  defaults: { scopes: {} }
})

function scopeGroups(): ClusterGroupsState {
  const scopes = store.get('scopes') ?? {}
  return scopes[getSessionScope()] ?? []
}

function writeScopeGroups(groups: ClusterGroupsState): void {
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = groups
  store.set('scopes', scopes)
}

function normalizeGroup(g: ClusterGroup): ClusterGroup {
  const shortcut = normalizeGroupShortcut(g.shortcut)
  return {
    id: g.id,
    name: g.name.trim() || 'Workspace',
    clusterIds: [...new Set(g.clusterIds)],
    collapsed: g.collapsed,
    ...(typeof g.logoUrl === 'string' && g.logoUrl.trim() ? { logoUrl: g.logoUrl.trim() } : {}),
    ...(shortcut !== undefined ? { shortcut } : {})
  }
}

export function listClusterGroups(): ClusterGroupsState {
  return scopeGroups().map((g) => normalizeGroup({ ...g, clusterIds: [...g.clusterIds] }))
}

export function saveClusterGroups(groups: ClusterGroupsState): ClusterGroupsState {
  const cleaned = groups.map((g) => normalizeGroup(g))
  writeScopeGroups(cleaned)
  return listClusterGroups()
}

export function createClusterGroup(name: string): ClusterGroupsState {
  const groups = listClusterGroups()
  groups.push({
    id: randomUUID(),
    name: name.trim() || 'Workspace',
    clusterIds: [],
    collapsed: false,
    shortcut: null
  })
  return saveClusterGroups(groups)
}

export function updateClusterGroup(
  id: string,
  patch: Partial<Pick<ClusterGroup, 'name' | 'clusterIds' | 'collapsed' | 'shortcut' | 'logoUrl'>>
): ClusterGroupsState {
  const groups = listClusterGroups().map((g) => {
    if (g.id !== id) return g
    const next = { ...g, ...patch }
    // Explicit null/empty clears the logo.
    if ('logoUrl' in patch && !patch.logoUrl) {
      delete next.logoUrl
    }
    return next
  })
  return saveClusterGroups(groups)
}

export function removeClusterGroup(id: string): ClusterGroupsState {
  return saveClusterGroups(listClusterGroups().filter((g) => g.id !== id))
}

export function removeClusterFromAllGroups(clusterId: string): void {
  const next = listClusterGroups().map((g) => ({
    ...g,
    clusterIds: g.clusterIds.filter((id) => id !== clusterId)
  }))
  writeScopeGroups(next)
}
