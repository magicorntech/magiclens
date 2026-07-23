import type { KubeconfigSource } from './kubeconfig'
import type { ResourceKind } from '../resourceKinds'

export type ClusterOrigin = 'local' | 'org'

export type ConnectionStatus = 'idle' | 'disconnected' | 'connecting' | 'connected' | 'error'

export interface PersistedClusterEntry {
  id: string
  customName: string
  contextName: string
  source: KubeconfigSource
  endpoint?: string
  /** Stable hash of kubeconfig user auth for this context (token/cert/exec). */
  authFingerprint?: string
  logoUrl?: string
  /**
   * Wallpaper: `default-01`…`default-10`, `custom`, or omit for none.
   * When `custom`, `backgroundCustomUrl` holds a compressed JPEG data URL.
   */
  backgroundId?: string
  backgroundCustomUrl?: string
  /**
   * When a wallpaper is set: panel opacity 15–100 (percent).
   * Higher = more solid menus/tables; lower = more of the wallpaper shows through.
   * Default 70.
   */
  backgroundPanelOpacity?: number
  /** Manual Prometheus base URL or API-server proxy path. Empty = auto-discover on connect. */
  prometheusUrl?: string
  isFavorite: boolean
  selectedNamespace: string
  selectedResourceKind: ResourceKind | null
  lastOpenedAt?: string
  origin?: ClusterOrigin
  /** Stable org import key: `{kubeconfigId}:{contextName}` */
  remoteId?: string
  /** Parent org kubeconfig id for sync cleanup */
  orgKubeconfigId?: string
  environment?: string
  /** On-disk per-user kubeconfig written for org sync (email@context.kubeconfig) */
  localKubeconfigPath?: string
}

export interface ConnectRequest {
  clusterId: string
  source: KubeconfigSource
  contextName: string
}

export type ConnectResponse =
  | { ok: true; serverVersion: string; endpoint: string }
  | { ok: false; error: string }

export const CLUSTER_NOT_CONNECTED = 'CLUSTER_NOT_CONNECTED' as const

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
  activeView: 'clusters' | 'tabs' | 'admin' | 'profile' | 'vpn'
  splitView?: boolean
  splitLeftClusterId?: string | null
  splitRightClusterId?: string | null
  focusedSplitPane?: 'left' | 'right'
  leftSidebarCollapsed?: boolean
  resourceMenuCollapsed?: boolean
}
