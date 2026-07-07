import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  WorkloadChangeImageRequest,
  WorkloadContextInfo,
  WorkloadPermissionsRequest,
  WorkloadPermissionsResponse,
  WorkloadRollbackRequest,
  WorkloadScaleRequest,
  WorkloadTargetRequest
} from '@shared/types/workload'
import type { RolloutHistoryResponse, WorkloadActionResponse } from '@shared/types/workload'
import { clusterManager } from '../k8s/clusterManager'
import { getResourcePermissions } from '../k8s/rbacService'
import {
  changeWorkloadImage,
  deleteWorkloadPods,
  getDeploymentRolloutHistory,
  getWorkloadContext,
  rerunJob,
  restartWorkload,
  rollbackDeployment,
  scaleWorkload,
  setCronJobSuspended,
  setDeploymentPaused,
  setJobSuspended,
  triggerCronJob
} from '../k8s/workloadService'

function ok(kubectlCommand: string): WorkloadActionResponse {
  return { ok: true, kubectlCommand }
}

function err(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : String(error) }
}

export function registerWorkloadHandlers(): void {
  ipcMain.handle(
    IPC.WORKLOAD_GET_CONTEXT,
    async (_e, req: WorkloadTargetRequest): Promise<WorkloadContextInfo | { error: string }> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return await getWorkloadContext(clients, req.kind, req.namespace, req.name)
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(
    IPC.WORKLOAD_GET_PERMISSIONS,
    async (_e, req: WorkloadPermissionsRequest): Promise<WorkloadPermissionsResponse> => {
      const clients = clusterManager.require(req.clusterId)
      return getResourcePermissions(clients, req)
    }
  )

  ipcMain.handle(IPC.WORKLOAD_SCALE, async (_e, req: WorkloadScaleRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await scaleWorkload(clients, req.kind, req.namespace, req.name, req.replicas)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(IPC.WORKLOAD_RESTART, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await restartWorkload(clients, req.kind, req.namespace, req.name)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(IPC.WORKLOAD_PAUSE_ROLLOUT, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await setDeploymentPaused(clients, req.namespace, req.name, true)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(IPC.WORKLOAD_RESUME_ROLLOUT, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await setDeploymentPaused(clients, req.namespace, req.name, false)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(
    IPC.WORKLOAD_ROLLOUT_HISTORY,
    async (_e, req: WorkloadTargetRequest): Promise<RolloutHistoryResponse | { error: string }> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return await getDeploymentRolloutHistory(clients, req.namespace, req.name)
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(IPC.WORKLOAD_ROLLBACK, async (_e, req: WorkloadRollbackRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await rollbackDeployment(clients, req.namespace, req.name, req.revision)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(
    IPC.WORKLOAD_CHANGE_IMAGE,
    async (_e, req: WorkloadChangeImageRequest): Promise<WorkloadActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return ok(
          (await changeWorkloadImage(clients, req.kind, req.namespace, req.name, req.containerName, req.image))
            .kubectlCommand
        )
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(IPC.WORKLOAD_SUSPEND_JOB, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await setJobSuspended(clients, req.namespace, req.name, true)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(IPC.WORKLOAD_RESUME_JOB, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await setJobSuspended(clients, req.namespace, req.name, false)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(IPC.WORKLOAD_RERUN_JOB, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await rerunJob(clients, req.namespace, req.name)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })

  ipcMain.handle(
    IPC.WORKLOAD_SUSPEND_CRONJOB,
    async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return ok((await setCronJobSuspended(clients, req.namespace, req.name, true)).kubectlCommand)
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(
    IPC.WORKLOAD_RESUME_CRONJOB,
    async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return ok((await setCronJobSuspended(clients, req.namespace, req.name, false)).kubectlCommand)
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(
    IPC.WORKLOAD_TRIGGER_CRONJOB,
    async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return ok((await triggerCronJob(clients, req.namespace, req.name)).kubectlCommand)
      } catch (e) {
        return err(e)
      }
    }
  )

  ipcMain.handle(IPC.WORKLOAD_DELETE_PODS, async (_e, req: WorkloadTargetRequest): Promise<WorkloadActionResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      return ok((await deleteWorkloadPods(clients, req.kind, req.namespace, req.name)).kubectlCommand)
    } catch (e) {
      return err(e)
    }
  })
}
