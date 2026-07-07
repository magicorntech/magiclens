import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterIdRequest } from '@shared/types/cluster'
import type {
  PrometheusDiscoverRequest,
  PrometheusQueryRangeRequest,
  PrometheusQueryRequest,
  PrometheusQueryResponse,
  PrometheusStatus
} from '@shared/types/prometheus'
import {
  discoverPrometheus,
  getPrometheusStatus,
  prometheusQuery,
  prometheusQueryRange
} from '../k8s/prometheusService'

export function registerPrometheusHandlers(): void {
  ipcMain.handle(IPC.PROMETHEUS_DISCOVER, async (_e, req: PrometheusDiscoverRequest): Promise<PrometheusStatus> => {
    return discoverPrometheus(req)
  })

  ipcMain.handle(IPC.PROMETHEUS_GET_STATUS, async (_e, req: ClusterIdRequest): Promise<PrometheusStatus> => {
    return getPrometheusStatus(req.clusterId)
  })

  ipcMain.handle(
    IPC.PROMETHEUS_QUERY,
    async (_e, req: PrometheusQueryRequest): Promise<PrometheusQueryResponse> => prometheusQuery(req)
  )

  ipcMain.handle(
    IPC.PROMETHEUS_QUERY_RANGE,
    async (_e, req: PrometheusQueryRangeRequest): Promise<PrometheusQueryResponse> => prometheusQueryRange(req)
  )
}
