import { create } from 'zustand'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ConnectionStatus, PersistedClusterEntry, PersistedUiState } from '@shared/types/cluster'
import type { KubeconfigSource } from '@shared/types/kubeconfig'

export interface ClusterEntry {
  id: string
  customName: string
  contextName: string
  source: KubeconfigSource
  endpoint?: string
  logoUrl?: string
  isFavorite: boolean
  status: ConnectionStatus
  errorMessage?: string
  serverVersion?: string
  namespaces?: string[]
  selectedNamespace: string
  selectedResourceKind: ResourceKind | null
  openResourceKinds: ResourceKind[]
  lastOpenedAt?: string
}

interface ClusterStoreState {
  clusters: ClusterEntry[]
  openedTabs: string[]
  activeClusterId: string | null
  activeView: 'clusters' | 'tabs'
  splitView: boolean
  splitLeftClusterId: string | null
  splitRightClusterId: string | null
  focusedSplitPane: 'left' | 'right'
  leftSidebarCollapsed: boolean
  resourceMenuCollapsed: boolean

  addCluster: (entry: ClusterEntry) => void
  removeCluster: (id: string) => void
  openClusterTab: (id: string) => void
  closeClusterTab: (id: string) => void
  setActiveCluster: (id: string) => void
  setActiveView: (view: 'clusters' | 'tabs') => void
  enableSplitView: () => void
  disableSplitView: () => void
  setFocusedSplitPane: (pane: 'left' | 'right') => void
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  setResourceMenuCollapsed: (collapsed: boolean) => void
  toggleFavorite: (id: string) => void
  updateClusterMeta: (id: string, patch: Partial<Pick<ClusterEntry, 'customName' | 'logoUrl'>>) => void
  setClusterStatus: (id: string, status: ConnectionStatus, errorMessage?: string) => void
  setClusterConnected: (id: string, serverVersion: string, namespaces: string[], endpoint?: string) => void
  setSelectedNamespace: (id: string, namespace: string) => void
  setSelectedResourceKind: (id: string, kind: ResourceKind) => void
  openResourceKind: (id: string, kind: ResourceKind) => void
  closeResourceKind: (id: string, kind: ResourceKind) => void
  hydrateFromPersistence: (entries: PersistedClusterEntry[]) => void
  hydrateUiState: (uiState: PersistedUiState) => void
}

function updateCluster(clusters: ClusterEntry[], id: string, patch: Partial<ClusterEntry>): ClusterEntry[] {
  return clusters.map((c) => (c.id === id ? { ...c, ...patch } : c))
}

export const useClusterStore = create<ClusterStoreState>((set) => ({
  clusters: [],
  openedTabs: [],
  activeClusterId: null,
  activeView: 'clusters',
  splitView: false,
  splitLeftClusterId: null,
  splitRightClusterId: null,
  focusedSplitPane: 'left',
  leftSidebarCollapsed: false,
  resourceMenuCollapsed: false,

  addCluster: (entry) => set((state) => ({ clusters: [...state.clusters, entry] })),

  removeCluster: (id) =>
    set((state) => {
      const clusters = state.clusters.filter((c) => c.id !== id)
      const openedTabs = state.openedTabs.filter((t) => t !== id)
      const activeClusterId =
        state.activeClusterId === id
          ? (openedTabs.length > 0 ? openedTabs[openedTabs.length - 1] : null)
          : state.activeClusterId
      return { clusters, openedTabs, activeClusterId }
    }),

  openClusterTab: (id) =>
    set((state) => {
      const openedTabs = state.openedTabs.includes(id) ? state.openedTabs : [...state.openedTabs, id]
      return {
        openedTabs,
        activeClusterId: id,
        activeView: 'tabs',
        clusters: updateCluster(state.clusters, id, { lastOpenedAt: new Date().toISOString() })
      }
    }),

  closeClusterTab: (id) =>
    set((state) => {
      const openedTabs = state.openedTabs.filter((t) => t !== id)
      const activeClusterId =
        state.activeClusterId === id
          ? (openedTabs.length > 0 ? openedTabs[openedTabs.length - 1] : null)
          : state.activeClusterId

      let splitLeftClusterId = state.splitLeftClusterId
      let splitRightClusterId = state.splitRightClusterId
      if (splitLeftClusterId === id) {
        splitLeftClusterId = openedTabs.find((t) => t !== splitRightClusterId) ?? openedTabs[0] ?? null
      }
      if (splitRightClusterId === id) {
        splitRightClusterId = openedTabs.find((t) => t !== splitLeftClusterId) ?? null
      }
      const canSplit = splitLeftClusterId && splitRightClusterId && splitLeftClusterId !== splitRightClusterId

      return {
        openedTabs,
        activeClusterId,
        splitLeftClusterId: canSplit ? splitLeftClusterId : activeClusterId,
        splitRightClusterId: canSplit ? splitRightClusterId : null,
        splitView: state.splitView && !!canSplit
      }
    }),

  setActiveCluster: (id) =>
    set((state) => {
      if (state.splitView) {
        const pane = state.focusedSplitPane
        return {
          activeClusterId: id,
          ...(pane === 'left' ? { splitLeftClusterId: id } : { splitRightClusterId: id })
        }
      }
      return { activeClusterId: id }
    }),

  setActiveView: (view) => set({ activeView: view }),

  enableSplitView: () =>
    set((state) => {
      const left = state.activeClusterId ?? state.openedTabs[0] ?? null
      const right = state.openedTabs.find((t) => t !== left) ?? null
      if (!left || !right) return state
      return {
        splitView: true,
        splitLeftClusterId: left,
        splitRightClusterId: right,
        focusedSplitPane: 'left'
      }
    }),

  disableSplitView: () => set({ splitView: false }),

  setFocusedSplitPane: (pane) => set({ focusedSplitPane: pane }),

  setLeftSidebarCollapsed: (collapsed) => set({ leftSidebarCollapsed: collapsed }),

  setResourceMenuCollapsed: (collapsed) => set({ resourceMenuCollapsed: collapsed }),

  toggleFavorite: (id) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    })),

  updateClusterMeta: (id, patch) => set((state) => ({ clusters: updateCluster(state.clusters, id, patch) })),

  setClusterStatus: (id, status, errorMessage) =>
    set((state) => ({ clusters: updateCluster(state.clusters, id, { status, errorMessage }) })),

  setClusterConnected: (id, serverVersion, namespaces, endpoint) =>
    set((state) => ({
      clusters: updateCluster(state.clusters, id, {
        status: 'connected',
        serverVersion,
        namespaces,
        endpoint,
        errorMessage: undefined
      })
    })),

  setSelectedNamespace: (id, namespace) =>
    set((state) => ({ clusters: updateCluster(state.clusters, id, { selectedNamespace: namespace }) })),

  setSelectedResourceKind: (id, kind) =>
    set((state) => ({ clusters: updateCluster(state.clusters, id, { selectedResourceKind: kind }) })),

  openResourceKind: (id, kind) =>
    set((state) => {
      const cluster = state.clusters.find((c) => c.id === id)
      if (!cluster) return {}
      const openResourceKinds = cluster.openResourceKinds.includes(kind)
        ? cluster.openResourceKinds
        : [...cluster.openResourceKinds, kind]
      return { clusters: updateCluster(state.clusters, id, { openResourceKinds, selectedResourceKind: kind }) }
    }),

  closeResourceKind: (id, kind) =>
    set((state) => {
      const cluster = state.clusters.find((c) => c.id === id)
      if (!cluster) return {}
      const openResourceKinds = cluster.openResourceKinds.filter((k) => k !== kind)
      const selectedResourceKind =
        cluster.selectedResourceKind === kind
          ? (openResourceKinds.length > 0 ? openResourceKinds[openResourceKinds.length - 1] : null)
          : cluster.selectedResourceKind
      return { clusters: updateCluster(state.clusters, id, { openResourceKinds, selectedResourceKind }) }
    }),

  hydrateFromPersistence: (entries) =>
    set({
      clusters: entries.map((entry) => ({
        id: entry.id,
        customName: entry.customName,
        contextName: entry.contextName,
        source: entry.source,
        endpoint: entry.endpoint,
        logoUrl: entry.logoUrl,
        isFavorite: entry.isFavorite,
        status: 'idle',
        selectedNamespace: entry.selectedNamespace || 'ALL',
        selectedResourceKind: entry.selectedResourceKind,
        openResourceKinds: entry.selectedResourceKind ? [entry.selectedResourceKind] : []
      }))
    }),

  hydrateUiState: (uiState) =>
    set({
      openedTabs: uiState.openedTabs,
      activeClusterId: uiState.activeClusterId,
      activeView: uiState.activeView,
      splitView: uiState.splitView ?? false,
      splitLeftClusterId: uiState.splitLeftClusterId ?? uiState.activeClusterId,
      splitRightClusterId: uiState.splitRightClusterId ?? null,
      focusedSplitPane: uiState.focusedSplitPane ?? 'left',
      leftSidebarCollapsed: uiState.leftSidebarCollapsed ?? false,
      resourceMenuCollapsed: uiState.resourceMenuCollapsed ?? false
    })
}))
