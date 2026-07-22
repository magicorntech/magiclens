import Store from 'electron-store'
import type { PersistedUiState } from '@shared/types/cluster'
import { getSessionScope } from './sessionScope'

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

interface StoreSchema {
  scopes?: Record<string, PersistedUiState>
  /** @deprecated legacy global ui state — migrated to scopes.offline */
  openedTabs?: string[]
  activeClusterId?: string | null
  activeView?: PersistedUiState['activeView']
  splitView?: boolean
  splitLeftClusterId?: string | null
  splitRightClusterId?: string | null
  focusedSplitPane?: 'left' | 'right'
  leftSidebarCollapsed?: boolean
  resourceMenuCollapsed?: boolean
}

const store = new Store<StoreSchema>({
  name: 'ui-state',
  defaults: { scopes: {} }
})

function normalizeActiveView(view: unknown): PersistedUiState['activeView'] {
  return view === 'admin' ||
    view === 'profile' ||
    view === 'vpn' ||
    view === 'tabs' ||
    view === 'clusters'
    ? view
    : 'clusters'
}

function normalizeUiState(raw: Partial<PersistedUiState>): PersistedUiState {
  return {
    openedTabs: raw.openedTabs ?? [],
    activeClusterId: raw.activeClusterId ?? null,
    activeView: normalizeActiveView(raw.activeView),
    splitView: raw.splitView ?? false,
    splitLeftClusterId: raw.splitLeftClusterId ?? null,
    splitRightClusterId: raw.splitRightClusterId ?? null,
    focusedSplitPane: raw.focusedSplitPane ?? 'left',
    leftSidebarCollapsed: raw.leftSidebarCollapsed ?? false,
    resourceMenuCollapsed: raw.resourceMenuCollapsed ?? false
  }
}

function migrateLegacyIfNeeded(): void {
  const scopes = store.get('scopes')
  if (scopes && Object.keys(scopes).length > 0) return
  const hasLegacy =
    store.get('openedTabs') !== undefined ||
    store.get('activeView') !== undefined ||
    store.get('activeClusterId') !== undefined
  if (!hasLegacy) return
  const migrated = normalizeUiState({
    openedTabs: store.get('openedTabs'),
    activeClusterId: store.get('activeClusterId'),
    activeView: store.get('activeView'),
    splitView: store.get('splitView'),
    splitLeftClusterId: store.get('splitLeftClusterId'),
    splitRightClusterId: store.get('splitRightClusterId'),
    focusedSplitPane: store.get('focusedSplitPane'),
    leftSidebarCollapsed: store.get('leftSidebarCollapsed'),
    resourceMenuCollapsed: store.get('resourceMenuCollapsed')
  })
  store.set('scopes', { offline: migrated })
  const legacyKeys: Array<keyof StoreSchema> = [
    'openedTabs',
    'activeClusterId',
    'activeView',
    'splitView',
    'splitLeftClusterId',
    'splitRightClusterId',
    'focusedSplitPane',
    'leftSidebarCollapsed',
    'resourceMenuCollapsed'
  ]
  for (const key of legacyKeys) store.delete(key)
}

export function getUiState(): PersistedUiState {
  migrateLegacyIfNeeded()
  const scopes = store.get('scopes') ?? {}
  const scoped = scopes[getSessionScope()]
  return normalizeUiState(scoped ?? defaults)
}

export function setUiState(state: PersistedUiState): void {
  migrateLegacyIfNeeded()
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = normalizeUiState(state)
  store.set('scopes', scopes)
}
