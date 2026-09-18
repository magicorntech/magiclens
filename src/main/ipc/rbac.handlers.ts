import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { RbacCanIRequest, RbacCanIResponse, ResourcePermissionsRequest, ResourcePermissionsResponse } from '@shared/types/rbac'
import { clusterManager } from '../k8s/clusterManager'
import { getResourcePermissions, rbacCanI } from '../k8s/rbacService'
import { isDemoCluster } from '../k8s/demoMode'

export function registerRbacHandlers(): void {
  ipcMain.handle(IPC.RBAC_CAN_I, async (_e, req: RbacCanIRequest): Promise<RbacCanIResponse> => {
    if (isDemoCluster(req.clusterId)) return { allowed: true }
    try {
      const clients = clusterManager.require(req.clusterId)
      return rbacCanI(clients, req)
    } catch {
      return { allowed: false, reason: 'Cluster is not connected' }
    }
  })

  ipcMain.handle(
    IPC.RBAC_GET_RESOURCE_PERMISSIONS,
    async (_e, req: ResourcePermissionsRequest): Promise<ResourcePermissionsResponse> => {
      if (isDemoCluster(req.clusterId)) {
        return {
          canGet: true,
          canUpdate: true,
          canPatch: true,
          canDelete: true,
          canScale: true,
          canDeletePods: true,
          canCreateJobs: true,
          verified: true
        }
      }
      const clients = clusterManager.require(req.clusterId)
      return getResourcePermissions(clients, req)
    }
  )
}
