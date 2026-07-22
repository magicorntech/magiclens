import { create } from 'zustand'
import type { ClusterGroup, ClusterGroupsState } from '@shared/types/clusterGroup'
import type { ShortcutBinding } from '@shared/types/keyboardShortcuts'
import { bindingsEqual } from '@shared/types/keyboardShortcuts'
import { useClusterStore } from './clusterStore'

interface ClusterGroupsStoreState {
  groups: ClusterGroupsState
  hydrated: boolean
  hydrate: () => Promise<void>
  createGroup: (name: string, clusterIds?: string[], shortcut?: ShortcutBinding | null) => Promise<void>
  renameGroup: (id: string, name: string) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  setCollapsed: (id: string, collapsed: boolean) => Promise<void>
  setGroupClusters: (id: string, clusterIds: string[]) => Promise<void>
  setGroupShortcut: (id: string, shortcut: ShortcutBinding | null) => Promise<void>
  addClusterToGroup: (groupId: string, clusterId: string) => Promise<void>
  removeClusterFromGroup: (groupId: string, clusterId: string) => Promise<void>
  /** Expand workspace and open its clusters (focus first). */
  activateWorkspace: (id: string) => Promise<void>
}

export const useClusterGroupsStore = create<ClusterGroupsStoreState>()((set, get) => ({
  groups: [],
  hydrated: false,
  hydrate: async () => {
    const groups = await window.api.clusterGroups.list()
    set({ groups, hydrated: true })
  },
  createGroup: async (name, clusterIds = [], shortcut = null) => {
    let groups = await window.api.clusterGroups.create(name)
    const created = groups[groups.length - 1]
    if (created) {
      const patch: Partial<Pick<ClusterGroup, 'clusterIds' | 'shortcut'>> = {}
      if (clusterIds.length > 0) patch.clusterIds = clusterIds
      if (shortcut) patch.shortcut = shortcut
      if (Object.keys(patch).length > 0) {
        groups = await window.api.clusterGroups.update(created.id, patch)
      }
    }
    set({ groups })
  },
  renameGroup: async (id, name) => {
    const groups = await window.api.clusterGroups.update(id, { name })
    set({ groups })
  },
  removeGroup: async (id) => {
    const groups = await window.api.clusterGroups.remove(id)
    set({ groups })
  },
  setCollapsed: async (id, collapsed) => {
    const groups = await window.api.clusterGroups.update(id, { collapsed })
    set({ groups })
  },
  setGroupClusters: async (id, clusterIds) => {
    const groups = await window.api.clusterGroups.update(id, { clusterIds })
    set({ groups })
  },
  setGroupShortcut: async (id, shortcut) => {
    // Clear the same binding from other workspaces to avoid conflicts.
    if (shortcut) {
      for (const other of get().groups) {
        if (other.id === id || !other.shortcut) continue
        if (bindingsEqual(other.shortcut, shortcut)) {
          await window.api.clusterGroups.update(other.id, { shortcut: null })
        }
      }
    }
    const groups = await window.api.clusterGroups.update(id, { shortcut })
    set({ groups })
  },
  addClusterToGroup: async (groupId, clusterId) => {
    const group = get().groups.find((g) => g.id === groupId)
    if (!group) return
    if (group.clusterIds.includes(clusterId)) return
    const groups = await window.api.clusterGroups.update(groupId, {
      clusterIds: [...group.clusterIds, clusterId]
    })
    set({ groups })
  },
  removeClusterFromGroup: async (groupId, clusterId) => {
    const group = get().groups.find((g) => g.id === groupId)
    if (!group) return
    const groups = await window.api.clusterGroups.update(groupId, {
      clusterIds: group.clusterIds.filter((cid) => cid !== clusterId)
    })
    set({ groups })
  },
  activateWorkspace: async (id) => {
    const group = get().groups.find((g) => g.id === id)
    if (!group) return
    if (group.collapsed) {
      await get().setCollapsed(id, false)
    }
    const clusterStore = useClusterStore.getState()
    for (const clusterId of group.clusterIds) {
      clusterStore.openClusterTab(clusterId)
    }
    if (group.clusterIds[0]) {
      clusterStore.setActiveCluster(group.clusterIds[0])
    } else {
      clusterStore.setActiveView('clusters')
    }
  }
}))
