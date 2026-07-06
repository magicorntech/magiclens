import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  HelmChartsResponse,
  HelmReleaseHistoryRequest,
  HelmReleaseHistoryResponse,
  HelmReleasesResponse,
  HelmRollbackRequest,
  HelmRollbackResponse
} from '@shared/types/helm'
import { clusterManager } from '../k8s/clusterManager'
import { getHelmReleaseHistory, listHelmCharts, listHelmReleases, rollbackHelmRelease } from '../k8s/helmService'

export function registerHelmHandlers(): void {
  ipcMain.handle(IPC.HELM_LIST_RELEASES, async (_e, req: ClusterIdRequest): Promise<HelmReleasesResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const releases = await listHelmReleases(clients)
      return { releases }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.HELM_LIST_CHARTS, async (_e, req: ClusterIdRequest): Promise<HelmChartsResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const charts = await listHelmCharts(clients)
      return { charts }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    IPC.HELM_GET_HISTORY,
    async (_e, req: HelmReleaseHistoryRequest): Promise<HelmReleaseHistoryResponse> => {
      try {
        const clients = clusterManager.get(req.clusterId)
        const history = await getHelmReleaseHistory(clients, req.namespace, req.name)
        return { history }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC.HELM_ROLLBACK, async (_e, req: HelmRollbackRequest): Promise<HelmRollbackResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const { newRevision, warnings } = await rollbackHelmRelease(
        clients,
        req.namespace,
        req.name,
        req.targetRevision
      )
      return { ok: true, newRevision, warnings }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
