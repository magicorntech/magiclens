import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  HelmChartsResponse,
  HelmReleaseHistoryRequest,
  HelmReleaseHistoryResponse,
  HelmReleaseDetailRequest,
  HelmReleaseDetailResponse,
  HelmReleasesResponse,
  HelmRollbackRequest,
  HelmRollbackResponse,
  HelmUninstallChartRequest,
  HelmUninstallChartResponse,
  HelmUninstallReleaseRequest,
  HelmUninstallReleaseResponse
} from '@shared/types/helm'
import { clusterManager } from '../k8s/clusterManager'
import {
  getHelmReleaseHistory,
  getHelmReleaseDetail,
  listHelmCharts,
  listHelmReleases,
  rollbackHelmRelease,
  uninstallHelmChart,
  uninstallHelmRelease
} from '../k8s/helmService'

export function registerHelmHandlers(): void {
  ipcMain.handle(IPC.HELM_LIST_RELEASES, async (_e, req: ClusterIdRequest): Promise<HelmReleasesResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      const releases = await listHelmReleases(clients)
      return { releases }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.HELM_LIST_CHARTS, async (_e, req: ClusterIdRequest): Promise<HelmChartsResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
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
        const clients = clusterManager.require(req.clusterId)
        const history = await getHelmReleaseHistory(clients, req.namespace, req.name)
        return { history }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.HELM_GET_RELEASE_DETAIL,
    async (_e, req: HelmReleaseDetailRequest): Promise<HelmReleaseDetailResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const detail = await getHelmReleaseDetail(clients, req.namespace, req.name)
        return { detail }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC.HELM_ROLLBACK, async (_e, req: HelmRollbackRequest): Promise<HelmRollbackResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
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

  ipcMain.handle(
    IPC.HELM_UNINSTALL_CHART,
    async (_e, req: HelmUninstallChartRequest): Promise<HelmUninstallChartResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const { uninstalled, warnings } = await uninstallHelmChart(clients, req.chartName, req.chartVersion)
        return { ok: true, uninstalled, warnings }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.HELM_UNINSTALL_RELEASE,
    async (_e, req: HelmUninstallReleaseRequest): Promise<HelmUninstallReleaseResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const { warnings } = await uninstallHelmRelease(clients, req.namespace, req.name)
        return { ok: true, warnings }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
