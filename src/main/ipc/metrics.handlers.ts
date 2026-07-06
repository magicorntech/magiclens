import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import { clusterManager } from '../k8s/clusterManager'
import { getClusterMetricsSummary, getNodeMetricsTable } from '../k8s/metricsService'

export function registerMetricsHandlers(): void {
  ipcMain.handle(IPC.METRICS_GET_CLUSTER_SUMMARY, async (_e, req: ClusterIdRequest) => {
    const clients = clusterManager.get(req.clusterId)
    return getClusterMetricsSummary(clients)
  })

  ipcMain.handle(IPC.METRICS_GET_NODE_METRICS, async (_e, req: ClusterIdRequest) => {
    const clients = clusterManager.get(req.clusterId)
    return getNodeMetricsTable(clients)
  })
}
