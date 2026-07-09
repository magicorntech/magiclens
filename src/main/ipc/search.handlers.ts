import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import type { GlobalSearchRequest, GlobalSearchResponse } from '@shared/types/search'
import { withClusterClients } from '../k8s/withClusterClients'
import { searchClusterResources } from '../k8s/searchService'

export function registerSearchHandlers(): void {
  ipcMain.handle(IPC.SEARCH_RESOURCES, async (_e, req: GlobalSearchRequest): Promise<GlobalSearchResponse> => {
    try {
      const result = await withClusterClients(req.clusterId, async (clients) => {
        const groups = await searchClusterResources(clients, req.clusterId, req.clusterName, req)
        return { groups }
      })
      if ('error' in result) return { error: CLUSTER_NOT_CONNECTED }
      return result
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
