import { enterpriseApi } from './api'
import { useAuthStore } from '../stores/authStore'
import { useClusterStore } from '../stores/clusterStore'
import { useVpnStore } from '../stores/vpnStore'

export async function reloadLocalClusters(): Promise<void> {
  const { clusters: persisted } = await window.api.clusterStore.list()
  const prev = useClusterStore.getState().clusters
  const prevById = new Map(prev.map((c) => [c.id, c]))
  const prevByRemote = new Map(
    prev.filter((c) => c.remoteId).map((c) => [c.remoteId!, c] as const)
  )

  useClusterStore.getState().hydrateFromPersistence(persisted)

  useClusterStore.setState((state) => ({
    clusters: state.clusters.map((c) => {
      const old = prevById.get(c.id) ?? (c.remoteId ? prevByRemote.get(c.remoteId) : undefined)
      if (!old) return c
      return {
        ...c,
        status: old.status,
        serverVersion: old.serverVersion,
        namespaces: old.namespaces,
        errorMessage: old.errorMessage,
        openResourceKinds: old.openResourceKinds.length ? old.openResourceKinds : c.openResourceKinds,
        selectedResourceKind: old.selectedResourceKind ?? c.selectedResourceKind,
        selectedNamespace: c.selectedNamespace
      }
    })
  }))
}

export async function syncOrgKubeconfigs(): Promise<number> {
  const me = useAuthStore.getState().me
  if (!me?.email) return 0

  if (!me.kubeconfigs?.length) {
    await window.api.clusterStore.syncOrgIds([], [], [])
    await reloadLocalClusters()
    return 0
  }

  let synced = 0
  const orgIds: string[] = []
  const remoteIds: string[] = []
  const successfullySyncedOrgIds: string[] = []
  const errors: string[] = []

  for (const remote of me.kubeconfigs) {
    orgIds.push(remote.id)
    if (remote.hasConfig === false) {
      errors.push(`${remote.name}: credentials not uploaded yet`)
      continue
    }
    try {
      const detail = await enterpriseApi<{
        id: string
        name: string
        content: string
        serverEndpoint: string | null
        environment: string | null
      }>(`/kubeconfigs/${remote.id}/config`)
      const parsed = await window.api.kubeconfig.parseString({ yaml: detail.content })
      const multiContext = parsed.contexts.length > 1

      for (const ctx of parsed.contexts) {
        const remoteId = `${remote.id}:${ctx.name}`
        remoteIds.push(remoteId)
        const displayName = multiContext ? `${remote.name} · ${ctx.name}` : remote.name
        await window.api.clusterStore.upsertOrg({
          remoteId,
          orgKubeconfigId: remote.id,
          customName: displayName,
          contextName: ctx.name,
          yamlContent: detail.content,
          userEmail: me.email,
          endpoint: ctx.server ?? remote.serverEndpoint ?? detail.serverEndpoint ?? undefined,
          environment: remote.environment ?? detail.environment ?? undefined
        })
        synced++
      }
      successfullySyncedOrgIds.push(remote.id)
    } catch (err) {
      errors.push(`${remote.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  await window.api.clusterStore.syncOrgIds(orgIds, remoteIds, successfullySyncedOrgIds)
  await reloadLocalClusters()

  if (errors.length) {
    console.warn('[magiclens] kubeconfig sync issues:', errors.join('; '))
  }

  return synced
}

export async function syncOrgAssignments(): Promise<{ kubeconfigs: number; vpn: number }> {
  const [kubeconfigs, vpn] = await Promise.all([
    syncOrgKubeconfigs(),
    useVpnStore.getState().syncOrgProfiles()
  ])
  await useVpnStore.getState().refresh()
  return { kubeconfigs, vpn }
}
