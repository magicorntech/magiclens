import { create } from 'zustand'
import type { ClusterGroup, ClusterGroupsState } from '@shared/types/clusterGroup'

interface ClusterGroupsStoreState {
  groups: ClusterGroupsState
  hydrated: boolean
  hydrate: () => Promise<void>
  createGroup: (name: string, clusterIds?: string[]) => Promise<void>
  renameGroup: (id: string, name: string) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  setCollapsed: (id: string, collapsed: boolean) => Promise<void>
  setGroupClusters: (id: string, clusterIds: string[]) => Promise<void>
  addClusterToGroup: (groupId: string, clusterId: string) => Promise<void>
  removeClusterFromGroup: (groupId: string, clusterId: string) => Promise<void>
}

export const useClusterGroupsStore = create<ClusterGroupsStoreState>()((set, get) => ({
  groups: [],
  hydrated: false,
  hydrate: async () => {
    const groups = await window.api.clusterGroups.list()
    set({ groups, hydrated: true })
  },
  createGroup: async (name, clusterIds = []) => {
    let groups = await window.api.clusterGroups.create(name)
    const created = groups[groups.length - 1]
    if (created && clusterIds.length > 0) {
      groups = await window.api.clusterGroups.update(created.id, { clusterIds })
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
      clusterIds: group.clusterIds.filter((id) => id !== clusterId)
    })
    set({ groups })
  }
}))
