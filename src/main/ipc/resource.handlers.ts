import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ResourceListRequest, ResourceListResponse } from '@shared/types/resource'
import { clusterManager } from '../k8s/clusterManager'
import { resourceRegistry } from '../k8s/resourceRegistry'

export function registerResourceHandlers(): void {
  ipcMain.handle(IPC.RESOURCE_LIST, async (_e, req: ResourceListRequest): Promise<ResourceListResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const config = resourceRegistry[req.kind]
      const items = await config.list(clients, req.namespace)
      return { items }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
