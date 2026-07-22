import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { ClusterGroup, ClusterGroupsState } from '@shared/types/clusterGroup'
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

export function listClusterGroups(): ClusterGroupsState {
  return scopeGroups().map((g) => ({ ...g, clusterIds: [...g.clusterIds] }))
}

export function saveClusterGroups(groups: ClusterGroupsState): ClusterGroupsState {
  const cleaned = groups.map((g) => ({
    id: g.id,
    name: g.name.trim() || 'Workspace',
    clusterIds: [...new Set(g.clusterIds)],
    collapsed: g.collapsed
  }))
  writeScopeGroups(cleaned)
  return listClusterGroups()
}

export function createClusterGroup(name: string): ClusterGroupsState {
  const groups = listClusterGroups()
  groups.push({
    id: randomUUID(),
    name: name.trim() || 'Workspace',
    clusterIds: [],
    collapsed: false
  })
  return saveClusterGroups(groups)
}

export function updateClusterGroup(
  id: string,
  patch: Partial<Pick<ClusterGroup, 'name' | 'clusterIds' | 'collapsed'>>
): ClusterGroupsState {
  const groups = listClusterGroups().map((g) => (g.id === id ? { ...g, ...patch } : g))
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
