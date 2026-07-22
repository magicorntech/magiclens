import { useVpnStore } from './stores/vpnStore'
import { useClusterVpnStore } from './stores/clusterVpnStore'
import { useVpnSessionStore } from './stores/vpnSessionStore'
import { useClusterStore } from './stores/clusterStore'
import { connectCluster, disconnectCluster } from './clusterConnect'

let switchInFlight: Promise<void> | null = null
let pendingCluster: { clusterId: string; clusterName?: string } | null = null

const VPN_SETTLE_MS = 2000
const CLUSTER_CONNECT_ATTEMPTS = 5
const CLUSTER_CONNECT_GAP_MS = 2000

/**
 * Ensure the linked VPN tunnel is up (without tearing down other VPNs),
 * then (re)connect the cluster API if needed.
 */
export async function ensureClusterAccess(
  clusterId: string,
  clusterName?: string
): Promise<void> {
  pendingCluster = { clusterId, clusterName }

  if (!switchInFlight) {
    switchInFlight = drainClusterAccessQueue()
  }
  await switchInFlight
}

async function drainClusterAccessQueue(): Promise<void> {
  try {
    while (pendingCluster) {
      const target = pendingCluster
      pendingCluster = null
      await runEnsureAccess(target.clusterId, target.clusterName)
    }
  } finally {
    switchInFlight = null
    if (pendingCluster) {
      switchInFlight = drainClusterAccessQueue()
    }
  }
}

/** @deprecated prefer ensureClusterAccess */
export async function ensureVpnForCluster(
  clusterId: string,
  clusterName?: string
): Promise<void> {
  await ensureClusterAccess(clusterId, clusterName)
}

function isVpnProfileUp(vpnProfileId: string): boolean {
  const status = useVpnStore.getState().status
  if (!status) return false
  if (status.connectedProfileIds?.includes(vpnProfileId)) return true
  return status.status === 'connected' && status.activeProfileId === vpnProfileId
}

async function runEnsureAccess(clusterId: string, clusterName?: string): Promise<void> {
  const vpnProfileId = useClusterVpnStore.getState().getLink(clusterId)
  if (vpnProfileId) {
    void window.api.vpn.setFocus(vpnProfileId)
  }

  const alreadyUp = vpnProfileId ? isVpnProfileUp(vpnProfileId) : true

  const vpnReady = await connectLinkedVpn(clusterId, clusterName)
  if (!vpnReady) return

  if (useClusterStore.getState().activeClusterId !== clusterId) return

  // Drop cluster clients whose VPN tunnel is no longer up (keep others — multi-tunnel).
  await staleClustersMissingVpn(clusterId)

  const cluster = useClusterStore.getState().clusters.find((c) => c.id === clusterId)
  if (!cluster) return

  if (alreadyUp && cluster.status === 'connected') {
    return
  }

  const newlyBroughtUp = !!vpnProfileId && !alreadyUp
  if (newlyBroughtUp) {
    await sleep(VPN_SETTLE_MS)
    if (useClusterStore.getState().activeClusterId !== clusterId) return
  }

  await reconnectClusterWithRetry(clusterId, {
    force: newlyBroughtUp || cluster.status !== 'connected'
  })
}

async function staleClustersMissingVpn(activeClusterId: string): Promise<void> {
  const { clusters } = useClusterStore.getState()
  const links = useClusterVpnStore.getState().links
  const status = useVpnStore.getState().status
  const up = new Set(status?.connectedProfileIds ?? [])
  if (status?.activeProfileId && status.status === 'connected') {
    up.add(status.activeProfileId)
  }

  for (const cluster of clusters) {
    if (cluster.id === activeClusterId) continue
    const link = links[cluster.id]
    if (!link) continue
    if (up.has(link)) continue
    if (cluster.status !== 'connected' && cluster.status !== 'connecting') continue
    await disconnectCluster(cluster.id)
    useClusterStore.getState().setClusterStatus(cluster.id, 'idle')
  }
}

/**
 * Returns false when VPN is required but not ready yet (auth prompt / failed).
 * Does NOT disconnect other VPN tunnels.
 */
async function connectLinkedVpn(clusterId: string, clusterName?: string): Promise<boolean> {
  const vpnProfileId = useClusterVpnStore.getState().getLink(clusterId)
  if (!vpnProfileId) return true

  const profiles = useVpnStore.getState().profiles
  const profile = profiles.find((p) => p.id === vpnProfileId)
  if (!profile || !profile.hasConfig) return true

  if (isVpnProfileUp(vpnProfileId)) {
    return true
  }

  const status = useVpnStore.getState().status
  if (status?.status === 'connecting' && status.activeProfileId === vpnProfileId) {
    return waitForVpnProfile(vpnProfileId, 90_000)
  }

  const sessionCreds = useVpnSessionStore.getState().getCredentials(vpnProfileId)
  if (profile.requiresAuth && !sessionCreds) {
    useVpnSessionStore.getState().requestAuthPrompt({
      profileId: vpnProfileId,
      clusterId,
      clusterName
    })
    return false
  }

  // Keep other tunnels — do not disconnect them.
  const result = await useVpnStore.getState().connect(vpnProfileId, {
    credentials: sessionCreds
      ? {
          username: profile.username,
          pin: sessionCreds.pin,
          mfaCode: sessionCreds.mfaCode
        }
      : undefined
  })

  if (!result.ok && profile.requiresAuth) {
    const msg = (result.error ?? '').toLowerCase()
    if (/auth|pin|mfa|password|challenge|tls/i.test(msg)) {
      useVpnSessionStore.getState().clearCredentials(vpnProfileId)
      useVpnSessionStore.getState().requestAuthPrompt({
        profileId: vpnProfileId,
        clusterId,
        clusterName
      })
    }
    return false
  }

  return result.ok
}

function waitForVpnProfile(profileId: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now()
    const unsub = useVpnStore.subscribe((state) => {
      if (isVpnProfileUp(profileId)) {
        unsub()
        resolve(true)
        return
      }
      const s = state.status
      if (s?.status === 'error' || s?.status === 'disconnected') {
        // Another profile may still be up — only fail if ours isn't connecting
        if (!s.connectedProfileIds?.includes(profileId)) {
          unsub()
          resolve(false)
        }
      }
    })
    const timer = setInterval(() => {
      if (isVpnProfileUp(profileId)) {
        clearInterval(timer)
        unsub()
        resolve(true)
        return
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        unsub()
        resolve(false)
      }
    }, 400)
  })
}

async function reconnectClusterWithRetry(
  clusterId: string,
  options: { force: boolean }
): Promise<void> {
  const cluster = useClusterStore.getState().clusters.find((c) => c.id === clusterId)
  if (!cluster) return

  if (!options.force && cluster.status === 'connected') return

  if (cluster.status === 'connecting' || cluster.status === 'connected') {
    await disconnectCluster(clusterId)
  }

  for (let attempt = 1; attempt <= CLUSTER_CONNECT_ATTEMPTS; attempt++) {
    if (useClusterStore.getState().activeClusterId !== clusterId) return

    const current = useClusterStore.getState().clusters.find((c) => c.id === clusterId)
    if (!current) return

    await connectCluster(current.id, current.source, current.contextName)

    const after = useClusterStore.getState().clusters.find((c) => c.id === clusterId)
    if (after?.status === 'connected') return

    if (attempt < CLUSTER_CONNECT_ATTEMPTS) {
      useClusterStore
        .getState()
        .setClusterStatus(
          clusterId,
          'connecting',
          `Waiting for VPN route… (try ${attempt + 1}/${CLUSTER_CONNECT_ATTEMPTS})`
        )
      await sleep(CLUSTER_CONNECT_GAP_MS)
    }
  }
}

export async function connectVpnWithSession(
  profileId: string,
  credentials: { pin: string; mfaCode: string },
  options?: { clusterId?: string; clusterName?: string }
): Promise<{ ok: boolean; error?: string }> {
  useVpnSessionStore.getState().setCredentials(profileId, credentials)
  useVpnSessionStore.getState().clearAuthPrompt()

  const profile = useVpnStore.getState().profiles.find((p) => p.id === profileId)

  // Do not tear down other tunnels when authenticating this one.
  const result = await useVpnStore.getState().connect(profileId, {
    credentials: {
      username: profile?.username,
      pin: credentials.pin,
      mfaCode: credentials.mfaCode
    }
  })

  if (result.ok && options?.clusterId) {
    await sleep(VPN_SETTLE_MS)
    if (useClusterStore.getState().activeClusterId === options.clusterId) {
      await reconnectClusterWithRetry(options.clusterId, { force: true })
    }
  }

  return result
}

/** True when this cluster should wait for VPN before attempting API connect. */
export function clusterNeedsVpn(clusterId: string): boolean {
  const vpnProfileId = useClusterVpnStore.getState().getLink(clusterId)
  if (!vpnProfileId) return false
  return !isVpnProfileUp(vpnProfileId)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
