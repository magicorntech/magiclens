import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import { addCluster, listClusters, removeCluster, updateCluster } from '../persistence/clusterStore'

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
    return { ok: true as const }
  })
}
