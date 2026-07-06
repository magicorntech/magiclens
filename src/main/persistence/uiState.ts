import Store from 'electron-store'
import type { PersistedUiState } from '@shared/types/cluster'

const defaults: PersistedUiState = {
  openedTabs: [],
  activeClusterId: null,
  activeView: 'clusters',
  splitView: false,
  splitLeftClusterId: null,
  splitRightClusterId: null,
  focusedSplitPane: 'left',
  leftSidebarCollapsed: false,
  resourceMenuCollapsed: false
}

const store = new Store<PersistedUiState>({
  name: 'ui-state',
  defaults
})

export function getUiState(): PersistedUiState {
  return {
    openedTabs: store.get('openedTabs'),
    activeClusterId: store.get('activeClusterId'),
    activeView: store.get('activeView'),
    splitView: store.get('splitView') ?? false,
    splitLeftClusterId: store.get('splitLeftClusterId') ?? null,
    splitRightClusterId: store.get('splitRightClusterId') ?? null,
    focusedSplitPane: store.get('focusedSplitPane') ?? 'left',
    leftSidebarCollapsed: store.get('leftSidebarCollapsed') ?? false,
    resourceMenuCollapsed: store.get('resourceMenuCollapsed') ?? false
  }
}

export function setUiState(state: PersistedUiState): void {
  store.set(state)
}
