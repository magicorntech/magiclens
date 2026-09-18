import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  CustomResourceKindsRequest,
  CustomResourceKindsResponse,
  DiscoveryRequest,
  DiscoveryResponse,
  DynamicResourceListRequest,
  DynamicResourceListResponse
} from '@shared/types/discovery'
import { clusterManager } from '../k8s/clusterManager'
import { listCustomResourceKinds } from '../k8s/customResourceService'
import { demoDiscovery, isDemoCluster } from '../k8s/demoMode'
import { discoverApiResources } from '../k8s/discoveryService'
import { listDynamicResources } from '../k8s/dynamicResourceService'

export function registerDiscoveryHandlers(): void {
  ipcMain.handle(IPC.DISCOVERY_LIST, async (_e, req: DiscoveryRequest): Promise<DiscoveryResponse> => {
    if (isDemoCluster(req.clusterId)) return demoDiscovery()
    const clients = clusterManager.require(req.clusterId)
    return discoverApiResources(req.clusterId, clients, req.refresh)
  })

  ipcMain.handle(
    IPC.DISCOVERY_LIST_CUSTOM_RESOURCE_KINDS,
    async (_e, req: CustomResourceKindsRequest): Promise<CustomResourceKindsResponse> => {
      if (isDemoCluster(req.clusterId)) return { kinds: [] }
      try {
        const clients = clusterManager.require(req.clusterId)
        const kinds = await listCustomResourceKinds(clients, req.onlyWithInstances)
        return { kinds }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.DISCOVERY_LIST_DYNAMIC_RESOURCES,
    async (_e, req: DynamicResourceListRequest): Promise<DynamicResourceListResponse> => {
      if (isDemoCluster(req.clusterId)) return { items: [] }
      try {
        const clients = clusterManager.require(req.clusterId)
        const items = await listDynamicResources(clients, req.apiVersion, req.kind, req.namespaced, req.namespace)
        return { items }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
