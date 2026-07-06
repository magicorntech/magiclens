import type { KubeconfigSource } from './kubeconfig'
import type { ResourceKind } from '../resourceKinds'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface PersistedClusterEntry {
  id: string
  customName: string
  contextName: string
  source: KubeconfigSource
  endpoint?: string
  logoUrl?: string
  isFavorite: boolean
  selectedNamespace: string
  selectedResourceKind: ResourceKind | null
  lastOpenedAt?: string
}

export interface ConnectRequest {
  clusterId: string
  source: KubeconfigSource
  contextName: string
}

export type ConnectResponse =
  | { ok: true; serverVersion: string; endpoint: string }
  | { ok: false; error: string }

export interface ClusterIdRequest {
  clusterId: string
}

export interface NamespacesResponse {
  namespaces: string[]
}

export interface ClusterVersionResponse {
  gitVersion: string
  platform: string
}

export interface PersistedUiState {
  openedTabs: string[]
  activeClusterId: string | null
  activeView: 'clusters' | 'tabs'
  splitView?: boolean
  splitLeftClusterId?: string | null
  splitRightClusterId?: string | null
  focusedSplitPane?: 'left' | 'right'
  leftSidebarCollapsed?: boolean
  resourceMenuCollapsed?: boolean
}
