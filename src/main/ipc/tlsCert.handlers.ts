import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { TlsCertListRequest, TlsCertListResponse } from '@shared/types/tlsCerts'
import { demoTlsCerts, isDemoCluster } from '../k8s/demoMode'
import { listTlsCerts } from '../k8s/tlsCertService'
import { withClusterClients } from '../k8s/withClusterClients'

export function registerTlsCertHandlers(): void {
  ipcMain.handle(
    IPC.CERTS_LIST,
    async (_e, req: TlsCertListRequest): Promise<TlsCertListResponse> => {
      if (isDemoCluster(req.clusterId)) return demoTlsCerts(req.clusterId)
      const result = await withClusterClients(req.clusterId, (clients) => listTlsCerts(clients))
      if ('error' in result) return { error: result.error }
      return result
    }
  )
}
