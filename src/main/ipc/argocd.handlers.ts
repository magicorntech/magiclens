import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  ArgoActionResponse,
  ArgoApplicationDetailResponse,
  ArgoApplicationRequest,
  ArgoApplicationSetsResponse,
  ArgoApplicationsResponse,
  ArgoBulkActionRequest,
  ArgoBulkActionResponse,
  ArgoClustersResponse,
  ArgoRepositoriesResponse,
  ArgoOverviewResponse,
  ArgoProjectsResponse
} from '@shared/types/argocd'
import { clusterManager } from '../k8s/clusterManager'
import {
  getArgoApplicationDetail,
  getArgoInstallation,
  listArgoClusters,
  listArgoRepositories,
  listArgoActivity,
  listArgoApplicationSets,
  listArgoApplications,
  listArgoProjects,
  needsAttention,
  refreshArgoApplication,
  summarize,
  syncArgoApplication
} from '../k8s/argoCdService'

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function registerArgoCdHandlers(): void {
  ipcMain.handle(
    IPC.ARGOCD_GET_OVERVIEW,
    async (_e, req: ClusterIdRequest): Promise<ArgoOverviewResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const installation = await getArgoInstallation(clients)
        if (!installation.installed) return { installation }

        // ApplicationSets and AppProjects are optional CRDs — a cluster can run Argo core
        // without them, and a 404 there shouldn't blank out the whole dashboard.
        const [applications, applicationSets, projects] = await Promise.all([
          listArgoApplications(clients),
          listArgoApplicationSets(clients).catch(() => []),
          listArgoProjects(clients).catch(() => [])
        ])

        const activity = await listArgoActivity(clients, installation.namespace).catch(() => [])

        return {
          installation,
          summary: summarize(applications, applicationSets.length, projects.length),
          needsAttention: needsAttention(applications),
          activity
        }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_LIST_APPLICATIONS,
    async (_e, req: ClusterIdRequest): Promise<ArgoApplicationsResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return { applications: await listArgoApplications(clients) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_LIST_APPLICATION_SETS,
    async (_e, req: ClusterIdRequest): Promise<ArgoApplicationSetsResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return { applicationSets: await listArgoApplicationSets(clients) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_LIST_PROJECTS,
    async (_e, req: ClusterIdRequest): Promise<ArgoProjectsResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return { projects: await listArgoProjects(clients) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_GET_APPLICATION_DETAIL,
    async (_e, req: ArgoApplicationRequest): Promise<ArgoApplicationDetailResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return { detail: await getArgoApplicationDetail(clients, req.namespace, req.name) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  // Both registries live as Secrets in Argo's own namespace, so the namespace is resolved first.
  ipcMain.handle(
    IPC.ARGOCD_LIST_REPOSITORIES,
    async (_e, req: ClusterIdRequest): Promise<ArgoRepositoriesResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const installation = await getArgoInstallation(clients)
        return { repositories: await listArgoRepositories(clients, installation.namespace) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_LIST_CLUSTERS,
    async (_e, req: ClusterIdRequest): Promise<ArgoClustersResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const installation = await getArgoInstallation(clients)
        return { clusters: await listArgoClusters(clients, installation.namespace) }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_SYNC_APPLICATION,
    async (_e, req: ArgoApplicationRequest): Promise<ArgoActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        await syncArgoApplication(clients, req.namespace, req.name)
        return { ok: true }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.ARGOCD_REFRESH_APPLICATION,
    async (_e, req: ArgoApplicationRequest): Promise<ArgoActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        await refreshArgoApplication(clients, req.namespace, req.name)
        return { ok: true }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )

  /**
   * Bulk sync. Failures are reported per application rather than aborting the batch — with
   * hundreds of apps, one RBAC-denied entry shouldn't stop the rest from syncing.
   */
  ipcMain.handle(
    IPC.ARGOCD_SYNC_MANY,
    async (_e, req: ArgoBulkActionRequest): Promise<ArgoBulkActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const failures: Array<{ name: string; error: string }> = []
        let succeeded = 0

        for (const target of req.targets) {
          try {
            await syncArgoApplication(clients, target.namespace, target.name)
            succeeded += 1
          } catch (err) {
            failures.push({ name: target.name, error: message(err) })
          }
        }

        return { succeeded, failures }
      } catch (err) {
        return { error: message(err) }
      }
    }
  )
}
