import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  ClusterMetricsRangeRequest,
  ClusterMetricsSummary,
  DeploymentMetricsRangeRequest,
  HpaMetricsRangeRequest,
  NodeMetricsRangeRequest,
  NodeMetricsResponse,
  NodePressureRequest,
  PodMetricsRangeRequest,
  PvcMetricsRangeRequest,
  PvcUsageRequest,
  PvcUsageResponse
} from '@shared/types/metrics'
import { withClusterClients } from '../k8s/withClusterClients'
import {
  getClusterMetricsRange,
  getDeploymentMetricsRange,
  getHpaMetricsRange,
  getNodeMetricsRange,
  getNodePressureMetrics,
  getPodMetricsRange,
  getPvcMetricsRange,
  getPvcUsageTable
} from '../k8s/metricsProviderService'
import { getClusterMetricsSummary, getNodeMetricsTable } from '../k8s/metricsService'
import { demoPvcUsage, demoClusterSummary, demoNodeMetrics, demoEmptyMetricsRange, isDemoCluster } from '../k8s/demoMode'

export function registerMetricsHandlers(): void {
  ipcMain.handle(
    IPC.METRICS_GET_CLUSTER_SUMMARY,
    async (_e, req: ClusterIdRequest): Promise<ClusterMetricsSummary | { error: string }> => {
      if (isDemoCluster(req.clusterId)) return demoClusterSummary(req.clusterId)
      const result = await withClusterClients(req.clusterId, (clients) =>
        getClusterMetricsSummary(clients, req.clusterId)
      )
      if ('error' in result) return result
      return result
    }
  )

  ipcMain.handle(
    IPC.METRICS_GET_NODE_METRICS,
    async (_e, req: ClusterIdRequest): Promise<NodeMetricsResponse | { error: string }> => {
      if (isDemoCluster(req.clusterId)) return demoNodeMetrics(req.clusterId)
      const result = await withClusterClients(req.clusterId, (clients) =>
        getNodeMetricsTable(clients, req.clusterId)
      )
      if ('error' in result) return result
      return result
    }
  )

  ipcMain.handle(IPC.METRICS_GET_NODE_RANGE, async (_e, req: NodeMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getNodeMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_POD_RANGE, async (_e, req: PodMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getPodMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_PVC_USAGE, async (_e, req: PvcUsageRequest): Promise<PvcUsageResponse> => {
    if (isDemoCluster(req.clusterId)) return demoPvcUsage(req.namespace, req.clusterId)
    return getPvcUsageTable(req)
  })
  ipcMain.handle(IPC.METRICS_GET_PVC_RANGE, async (_e, req: PvcMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getPvcMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_CLUSTER_RANGE, async (_e, req: ClusterMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getClusterMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_HPA_RANGE, async (_e, req: HpaMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getHpaMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_DEPLOYMENT_RANGE, async (_e, req: DeploymentMetricsRangeRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getDeploymentMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_NODE_PRESSURE, async (_e, req: NodePressureRequest) =>
    isDemoCluster(req.clusterId) ? demoEmptyMetricsRange(req.clusterId) : getNodePressureMetrics(req)
  )
}
