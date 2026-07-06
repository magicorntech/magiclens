import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  ClusterIdRequest,
  ClusterVersionResponse,
  ConnectRequest,
  ConnectResponse,
  NamespacesResponse
} from '@shared/types/cluster'
import { clusterManager } from '../k8s/clusterManager'
import { clearDiscoveryCache } from '../k8s/discoveryService'
import { portForwardManager } from '../k8s/portForwardManager'

export function registerClusterHandlers(): void {
  ipcMain.handle(IPC.CLUSTER_CONNECT, async (_e, req: ConnectRequest): Promise<ConnectResponse> => {
    try {
      const clients = clusterManager.connect(req.clusterId, req.source, req.contextName)
      const [versionInfo] = await Promise.all([clients.version.getCode(), clients.core.listNamespace()])
      const endpoint = clients.kc.getCurrentCluster()?.server ?? ''
      return { ok: true, serverVersion: versionInfo.gitVersion, endpoint }
    } catch (err) {
      clusterManager.disconnect(req.clusterId)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CLUSTER_DISCONNECT, async (_e, req: ClusterIdRequest) => {
    portForwardManager.stopAllForCluster(req.clusterId)
    clusterManager.disconnect(req.clusterId)
    clearDiscoveryCache(req.clusterId)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.CLUSTER_GET_VERSION, async (_e, req: ClusterIdRequest): Promise<ClusterVersionResponse> => {
    const clients = clusterManager.get(req.clusterId)
    const versionInfo = await clients.version.getCode()
    return { gitVersion: versionInfo.gitVersion, platform: versionInfo.platform }
  })

  ipcMain.handle(IPC.CLUSTER_LIST_NAMESPACES, async (_e, req: ClusterIdRequest): Promise<NamespacesResponse> => {
    const clients = clusterManager.get(req.clusterId)
    const res = await clients.core.listNamespace()
    return { namespaces: res.items.map((ns) => ns.metadata?.name ?? '').filter(Boolean) }
  })
}
