import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ServiceDetailResponse, ServiceResourceRequest } from '@shared/types/service'
import { clusterManager } from '../k8s/clusterManager'
import { getServiceDetail } from '../k8s/serviceService'

export function registerServiceHandlers(): void {
  ipcMain.handle(IPC.SERVICE_GET_DETAIL, async (_e, req: ServiceResourceRequest): Promise<ServiceDetailResponse> => {
    const clients = clusterManager.require(req.clusterId)
    return getServiceDetail(clients, req.namespace, req.serviceName)
  })
}
