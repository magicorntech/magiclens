import type { MeResponse } from '../enterprise/api'
import { useClusterStore } from './stores/clusterStore'
import { useClusterVpnStore } from './stores/clusterVpnStore'
import { connectCluster, disconnectCluster } from './clusterConnect'
import { ensureClusterAccess } from './clusterVpn'

export function resolveUserScope(me: MeResponse | null, offlineMode: boolean): string {
  if (offlineMode || !me) return 'offline'
  return `user:${me.id}`
}

function normalizeUiStateForClusters(
  uiState: Awaited<ReturnType<typeof window.api.uiState.get>>,
  persistedIds: Set<string>
) {
  const openedTabs = uiState.openedTabs.filter((id) => persistedIds.has(id))
  const activeClusterId =
    uiState.activeClusterId && openedTabs.includes(uiState.activeClusterId)
      ? uiState.activeClusterId
      : (openedTabs[0] ?? null)

  const activeView =
    uiState.activeView === 'admin' ||
    uiState.activeView === 'profile' ||
    uiState.activeView === 'vpn' ||
    uiState.activeView === 'tabs' ||
    uiState.activeView === 'clusters'
      ? uiState.activeView
      : 'clusters'

  return {
    openedTabs,
    activeClusterId,
    activeView,
    splitView: uiState.splitView,
    splitLeftClusterId: uiState.splitLeftClusterId,
    splitRightClusterId: uiState.splitRightClusterId,
    focusedSplitPane: uiState.focusedSplitPane,
    leftSidebarCollapsed: uiState.leftSidebarCollapsed,
    resourceMenuCollapsed: uiState.resourceMenuCollapsed
  }
}

export type SwitchWorkspaceOptions = {
  /** When false, hydrate clusters/UI but do not reconnect tabs (e.g. before org sync). */
  reconnect?: boolean
}

/** Switch main-process persistence scope and reload clusters + UI state for that user. */
export async function switchWorkspace(
  scope: string,
  options: SwitchWorkspaceOptions = {}
): Promise<void> {
  const reconnect = options.reconnect !== false

  const previous = useClusterStore.getState().clusters
  for (const cluster of previous) {
    if (cluster.status === 'connected' || cluster.status === 'connecting') {
      await disconnectCluster(cluster.id)
    }
  }

  try {
    await Promise.race([
      window.api.vpn.disconnect(),
      new Promise<void>((resolve) => setTimeout(resolve, 3000))
    ])
  } catch {
    // ignore
  }

  await window.api.session.setScope(scope)

  const [clusterResult, uiState] = await Promise.all([
    window.api.clusterStore.list(),
    window.api.uiState.get()
  ])

  const persisted = clusterResult.clusters
  const persistedIds = new Set(persisted.map((c) => c.id))
  const normalized = normalizeUiStateForClusters(uiState, persistedIds)

  useClusterStore.getState().hydrateFromPersistence(persisted)
  useClusterStore.getState().hydrateUiState(normalized)
  await useClusterVpnStore.getState().hydrate()

  if (!reconnect) return

  await reconnectOpenedTabs()
}

/** Reconnect opened tabs in the background — never block login/boot on cluster timeouts. */
export async function reconnectOpenedTabs(): Promise<void> {
  const { clusters, openedTabs, activeClusterId } = useClusterStore.getState()

  // Active cluster: VPN first, then API (only one VPN can be up at a time).
  if (activeClusterId) {
    const active = clusters.find((c) => c.id === activeClusterId)
    await ensureClusterAccess(activeClusterId, active?.customName)
  }

  // Other opened tabs: only auto-connect if they don't require a different VPN.
  const jobs = openedTabs
    .filter((id) => id !== activeClusterId)
    .map((id) => clusters.find((c) => c.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .filter((entry) => !useClusterVpnStore.getState().getLink(entry.id))
    .map((entry) =>
      Promise.race([
        connectCluster(entry.id, entry.source, entry.contextName),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const current = useClusterStore.getState().clusters.find((c) => c.id === entry.id)
            if (current?.status === 'connecting') {
              useClusterStore.getState().setClusterStatus(
                entry.id,
                'error',
                'Connection timed out — connect VPN first if this is a private cluster'
              )
            }
            resolve()
          }, 12_000)
        })
      ]).catch(() => undefined)
    )

  await Promise.all(jobs)
}

export function favoritesHeightKey(scope: string): string {
  return `ml-favorites-section-height:${scope}`
}
