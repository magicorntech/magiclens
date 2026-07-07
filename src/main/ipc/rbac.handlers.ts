import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { RbacCanIRequest, RbacCanIResponse, ResourcePermissionsRequest, ResourcePermissionsResponse } from '@shared/types/rbac'
import { clusterManager } from '../k8s/clusterManager'
import { getResourcePermissions, rbacCanI } from '../k8s/rbacService'

export function registerRbacHandlers(): void {
  ipcMain.handle(IPC.RBAC_CAN_I, async (_e, req: RbacCanIRequest): Promise<RbacCanIResponse> => {
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
      const clients = clusterManager.require(req.clusterId)
      return getResourcePermissions(clients, req)
    }
  )
}
