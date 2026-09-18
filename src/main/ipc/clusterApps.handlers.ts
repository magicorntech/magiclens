import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  ClusterAppOpenRequest,
  ClusterAppOpenResponse,
  ClusterAppSaveManualRequest,
  ClusterAppsDiscoverResponse
} from '@shared/types/clusterApps'
import { clusterManager } from '../k8s/clusterManager'
import {
  discoverClusterApps,
  openClusterApp,
  openManualIfSet,
  saveManualClusterApp
} from '../k8s/clusterAppsService'
import { isDemoCluster } from '../k8s/demoMode'
import { onSenderDestroyed } from './senderCleanup'
import { portForwardManager } from '../k8s/portForwardManager'

function demoApps(): ClusterAppsDiscoverResponse {
  return {
    apps: [
      { kind: 'argocd', found: false, source: 'none', displayName: 'Argo CD' },
      { kind: 'prometheus', found: false, source: 'none', displayName: 'Prometheus' },
      { kind: 'grafana', found: false, source: 'none', displayName: 'Grafana' }
    ]
  }
}

export function registerClusterAppsHandlers(): void {
  ipcMain.handle(
    IPC.CLUSTER_APPS_DISCOVER,
    async (_e, req: ClusterIdRequest): Promise<ClusterAppsDiscoverResponse> => {
      if (isDemoCluster(req.clusterId)) return demoApps()
      try {
        const clients = clusterManager.require(req.clusterId)
        return await discoverClusterApps(clients, req.clusterId)
      } catch (err) {
        return {
          apps: demoApps().apps.map((app) => ({
            ...app,
            error: err instanceof Error ? err.message : String(err)
          }))
        }
      }
    }
  )

  ipcMain.handle(
    IPC.CLUSTER_APPS_OPEN,
    async (event, req: ClusterAppOpenRequest): Promise<ClusterAppOpenResponse> => {
      const manual = openManualIfSet(req.clusterId, req.kind)
      if (isDemoCluster(req.clusterId)) {
        return (
          manual ?? {
            ok: false,
            missing: true,
            error: 'No URL yet. Add Grafana / Prometheus / Argo CD below.'
          }
        )
      }
      try {
        const clients = clusterManager.require(req.clusterId)
        const sender = event.sender
        onSenderDestroyed(sender, 'portForwardManager', () => portForwardManager.stopAllForSender(sender.id))
        return await openClusterApp(clients, req.clusterId, req.kind, sender.id)
      } catch (err) {
        return (
          manual ?? { ok: false, error: err instanceof Error ? err.message : String(err) }
        )
      }
    }
  )

  ipcMain.handle(
    IPC.CLUSTER_APPS_SAVE_MANUAL,
    async (_e, req: ClusterAppSaveManualRequest): Promise<{ ok: true } | { ok: false; error: string }> => {
      return saveManualClusterApp(req.clusterId, req.kind, {
        url: req.url,
        username: req.username,
        password: req.password
      })
    }
  )
}
