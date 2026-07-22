import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { removeClusterVpnLink } from '../persistence/clusterVpnLinks'
import { removeClusterFromAllGroups } from '../persistence/clusterGroups'
import {
  addCluster,
  listClusters,
  removeCluster,
  removeOrgClustersMissing,
  updateCluster,
  upsertOrgCluster
} from '../persistence/clusterStore'

export function registerClusterStoreHandlers(): void {
  ipcMain.handle(IPC.CLUSTER_STORE_LIST, async () => {
    return { clusters: listClusters() }
  })

  ipcMain.handle(IPC.CLUSTER_STORE_ADD, async (_e, entry: PersistedClusterEntry) => {
    const result = addCluster(entry)
    if (result === 'duplicate') return { ok: false as const, reason: 'duplicate' as const }
    return { ok: true as const }
  })

  ipcMain.handle(IPC.CLUSTER_STORE_UPDATE, async (_e, entry: PersistedClusterEntry) => {
    updateCluster(entry)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.CLUSTER_STORE_REMOVE, async (_e, req: { id: string }) => {
    removeCluster(req.id)
    removeClusterVpnLink(req.id)
    removeClusterFromAllGroups(req.id)
    return { ok: true as const }
  })

  ipcMain.handle(
    IPC.CLUSTER_STORE_UPSERT_ORG,
    async (
      _e,
      input: {
        remoteId: string
        orgKubeconfigId: string
        customName: string
        contextName: string
        source?: KubeconfigSource
        yamlContent?: string
        userEmail?: string
        endpoint?: string
        environment?: string
      }
    ) => {
      const entry = upsertOrgCluster(input)
      return { ok: true as const, cluster: entry }
    }
  )

  ipcMain.handle(
    IPC.CLUSTER_STORE_SYNC_ORG_IDS,
    async (
      _e,
      req: { orgKubeconfigIds: string[]; remoteIds: string[]; successfullySyncedOrgIds?: string[] }
    ) => {
      const removed = removeOrgClustersMissing(
        new Set(req.orgKubeconfigIds),
        new Set(req.remoteIds),
        new Set(req.successfullySyncedOrgIds ?? req.remoteIds.map((id) => id.split(':')[0]!))
      )
      for (const id of removed) {
        removeClusterVpnLink(id)
        removeClusterFromAllGroups(id)
      }
      return { ok: true as const, removed }
    }
  )
}
