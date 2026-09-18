import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  HelmCatalogSearchRequest,
  HelmCatalogSearchResponse,
  HelmChartPackageRequest,
  HelmChartPackageResponse,
  HelmChartsResponse,
  HelmInstallRequest,
  HelmInstallResponse,
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
import { isDemoCluster } from '../k8s/demoMode'
import {
  getHelmReleaseHistory,
  getHelmReleaseDetail,
  listHelmCharts,
  listHelmReleases,
  rollbackHelmRelease,
  uninstallHelmChart,
  uninstallHelmRelease
} from '../k8s/helmService'
import {
  demoHelmCatalog,
  demoHelmHistory,
  demoHelmPackage,
  demoHelmReleaseDetail,
  demoHelmReleases,
  getHelmPackage,
  installHelmChart,
  resolveChartRepo,
  searchHelmCatalog
} from '../k8s/helmCatalogService'

export function registerHelmHandlers(): void {
  ipcMain.handle(IPC.HELM_LIST_RELEASES, async (_e, req: ClusterIdRequest): Promise<HelmReleasesResponse> => {
    if (isDemoCluster(req.clusterId)) return { releases: demoHelmReleases() }
    try {
      const clients = clusterManager.require(req.clusterId)
      const releases = await listHelmReleases(clients)
      return { releases }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.HELM_LIST_CHARTS, async (_e, req: ClusterIdRequest): Promise<HelmChartsResponse> => {
    if (isDemoCluster(req.clusterId)) return { charts: [] }
    try {
      const clients = clusterManager.require(req.clusterId)
      const charts = await listHelmCharts(clients)
      return { charts }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    IPC.HELM_SEARCH_CATALOG,
    async (_e, req: HelmCatalogSearchRequest): Promise<HelmCatalogSearchResponse> => {
      try {
        const charts = await searchHelmCatalog(req.query)
        return { charts: charts.length ? charts : demoHelmCatalog(req.query) }
      } catch {
        return { charts: demoHelmCatalog(req.query) }
      }
    }
  )

  ipcMain.handle(
    IPC.HELM_GET_PACKAGE,
    async (_e, req: HelmChartPackageRequest): Promise<HelmChartPackageResponse> => {
      try {
        const pkg = await getHelmPackage(
          req.repoName,
          req.chartName,
          req.version,
          req.repoUrl,
          req.packageId
        )
        return { pkg }
      } catch {
        return { pkg: demoHelmPackage(req.repoName, req.chartName, req.version, req.repoUrl) }
      }
    }
  )

  ipcMain.handle(IPC.HELM_INSTALL, async (_e, req: HelmInstallRequest): Promise<HelmInstallResponse> => {
    if (isDemoCluster(req.clusterId)) {
      return { ok: true, output: 'Demo cluster — chart install is simulated.' }
    }
    try {
      const clients = clusterManager.require(req.clusterId)
      let repoUrl = req.repoUrl
      let repoName = req.repoName
      if (!repoUrl) {
        const resolved = await resolveChartRepo(req.chartName)
        if (!resolved) throw new Error(`Could not resolve a Helm repo for chart ${req.chartName}`)
        repoUrl = resolved.repoUrl
        repoName = resolved.repoName
      }
      const output = await installHelmChart(clients, { ...req, repoUrl, repoName })
      return { ok: true, output }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    IPC.HELM_GET_HISTORY,
    async (_e, req: HelmReleaseHistoryRequest): Promise<HelmReleaseHistoryResponse> => {
      if (isDemoCluster(req.clusterId)) return { history: demoHelmHistory(req.namespace, req.name) }
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
      if (isDemoCluster(req.clusterId)) return { detail: demoHelmReleaseDetail(req.namespace, req.name) }
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
    if (isDemoCluster(req.clusterId)) return { ok: true, newRevision: req.targetRevision + 1, warnings: [] }
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
      if (isDemoCluster(req.clusterId)) return { ok: true, uninstalled: [], warnings: [] }
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
      if (isDemoCluster(req.clusterId)) return { ok: true, warnings: [] }
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
