import { queryClient } from './queries/queryClient'
import { reconnectOpenedTabs } from './workspace'
import { useVpnStore } from './stores/vpnStore'
import { useClusterStore } from './stores/clusterStore'

const SETTLE_MS = 2_500
const DEBOUNCE_MS = 1_200

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> | null = null
let pendingReason: string | null = null

/**
 * After lid-close / sleep / brief offline, cluster API sockets and VPN tunnels are usually
 * dead even though the UI still says "connected". Wait for the network stack to settle, then
 * force-reconnect opened tabs and refresh VPN status — without spamming error toasts.
 */
export function scheduleNetworkResumeRecovery(reason: string): void {
  pendingReason = reason
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    const r = pendingReason ?? reason
    pendingReason = null
    void runRecovery(r)
  }, DEBOUNCE_MS)
}

function shouldForceReconnect(reason: string): boolean {
  if (reason === 'power-resume') return true
  const { clusters, openedTabs } = useClusterStore.getState()
  return openedTabs.some((id) => {
    const c = clusters.find((x) => x.id === id)
    return c?.status === 'error' || c?.status === 'disconnected' || c?.status === 'connecting'
  })
}

async function runRecovery(reason: string): Promise<void> {
  if (inFlight) {
    await inFlight
    return
  }

  const force = shouldForceReconnect(reason)
  if (!force && reason === 'browser-online') {
    // Healthy sessions — ignore routine online flaps.
    return
  }

  inFlight = (async () => {
    console.log(`[magiclens] network resume recovery (${reason}, force=${force})`)
    // Give Wi-Fi / VPN a moment after unlock/lid-open before hammering the API.
    await sleep(SETTLE_MS)

    try {
      await useVpnStore.getState().refresh()
    } catch {
      // best-effort
    }

    try {
      await reconnectOpenedTabs({ force })
    } catch (err) {
      console.warn('[magiclens] resume reconnect failed:', err)
    }

    // Drop stale query errors from the sleep window so the UI refetches cleanly.
    void queryClient.invalidateQueries()
  })()

  try {
    await inFlight
  } finally {
    inFlight = null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
