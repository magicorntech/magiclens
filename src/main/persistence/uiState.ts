import Store from 'electron-store'
import type { PersistedUiState } from '@shared/types/cluster'

const defaults: PersistedUiState = {
  openedTabs: [],
  activeClusterId: null,
  activeView: 'clusters'
}

const store = new Store<PersistedUiState>({
  name: 'ui-state',
  defaults
})

export function getUiState(): PersistedUiState {
  return {
    openedTabs: store.get('openedTabs'),
    activeClusterId: store.get('activeClusterId'),
    activeView: store.get('activeView')
  }
}

export function setUiState(state: PersistedUiState): void {
  store.set(state)
}
