import type { PersistedClusterEntry } from '@shared/types/cluster'
import { useClusterStore } from './stores/clusterStore'

/** Apply main-process dedupe result to renderer store + persisted UI tabs. */
export function applyDedupeResult(result: { clusters: PersistedClusterEntry[] }): void {
  useClusterStore.getState().hydrateFromPersistence(result.clusters)
  const kept = new Set(result.clusters.map((c) => c.id))
  useClusterStore.setState((state) => {
    const openedTabs = state.openedTabs.filter((id) => kept.has(id))
    const activeClusterId =
      state.activeClusterId && kept.has(state.activeClusterId)
        ? state.activeClusterId
        : openedTabs.length > 0
          ? openedTabs[openedTabs.length - 1]!
          : null
    return {
      openedTabs,
      activeClusterId,
      splitLeftClusterId:
        state.splitLeftClusterId && kept.has(state.splitLeftClusterId)
          ? state.splitLeftClusterId
          : activeClusterId,
      splitRightClusterId:
        state.splitRightClusterId && kept.has(state.splitRightClusterId)
          ? state.splitRightClusterId
          : null
    }
  })
  const s = useClusterStore.getState()
  void window.api.uiState.set({
    openedTabs: s.openedTabs,
    activeClusterId: s.activeClusterId,
    activeView: s.activeView,
    splitView: s.splitView,
    splitLeftClusterId: s.splitLeftClusterId,
    splitRightClusterId: s.splitRightClusterId,
    focusedSplitPane: s.focusedSplitPane,
    leftSidebarCollapsed: s.leftSidebarCollapsed,
    resourceMenuCollapsed: s.resourceMenuCollapsed
  })
}
