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
  PodMetricsRangeRequest
} from '@shared/types/metrics'
import { withClusterClients } from '../k8s/withClusterClients'
import {
  getClusterMetricsRange,
  getDeploymentMetricsRange,
  getHpaMetricsRange,
  getNodeMetricsRange,
  getNodePressureMetrics,
  getPodMetricsRange
} from '../k8s/metricsProviderService'
import { getClusterMetricsSummary, getNodeMetricsTable } from '../k8s/metricsService'

export function registerMetricsHandlers(): void {
  ipcMain.handle(
    IPC.METRICS_GET_CLUSTER_SUMMARY,
    async (_e, req: ClusterIdRequest): Promise<ClusterMetricsSummary | { error: string }> => {
      const result = await withClusterClients(req.clusterId, (clients) => getClusterMetricsSummary(clients))
      if ('error' in result) return result
      return result
    }
  )

  ipcMain.handle(
    IPC.METRICS_GET_NODE_METRICS,
    async (_e, req: ClusterIdRequest): Promise<NodeMetricsResponse | { error: string }> => {
      const result = await withClusterClients(req.clusterId, (clients) => getNodeMetricsTable(clients))
      if ('error' in result) return result
      return result
    }
  )

  ipcMain.handle(IPC.METRICS_GET_NODE_RANGE, async (_e, req: NodeMetricsRangeRequest) => getNodeMetricsRange(req))
  ipcMain.handle(IPC.METRICS_GET_POD_RANGE, async (_e, req: PodMetricsRangeRequest) => getPodMetricsRange(req))
  ipcMain.handle(IPC.METRICS_GET_CLUSTER_RANGE, async (_e, req: ClusterMetricsRangeRequest) => getClusterMetricsRange(req))
  ipcMain.handle(IPC.METRICS_GET_HPA_RANGE, async (_e, req: HpaMetricsRangeRequest) => getHpaMetricsRange(req))
  ipcMain.handle(
    IPC.METRICS_GET_DEPLOYMENT_RANGE,
    async (_e, req: DeploymentMetricsRangeRequest) => getDeploymentMetricsRange(req)
  )
  ipcMain.handle(IPC.METRICS_GET_NODE_PRESSURE, async (_e, req: NodePressureRequest) => getNodePressureMetrics(req))
}
