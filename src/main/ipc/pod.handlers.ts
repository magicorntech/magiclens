import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  PodDetailResponse,
  PodExecInputRequest,
  PodExecResizeRequest,
  PodExecSessionRequest,
  PodExecStartRequest,
  PodLogsDownloadRequest,
  PodLogsDownloadResponse,
  PodLogsSessionRequest,
  PodLogsStartRequest,
  PodMetricsResponse,
  PodNetworkResponse,
  PodResourceRequest
} from '@shared/types/pod'
import { clusterManager } from '../k8s/clusterManager'
import { getPodDetail, getPodMetrics, getPodNetwork } from '../k8s/podService'
import { podLogManager } from '../k8s/podLogManager'
import { downloadPodLogs } from '../k8s/podLogDownload'
import { podExecManager } from '../k8s/podExecManager'

export function registerPodHandlers(): void {
  ipcMain.handle(IPC.POD_GET_DETAIL, async (_e, req: PodResourceRequest): Promise<PodDetailResponse> => {
    const clients = clusterManager.get(req.clusterId)
    return getPodDetail(clients, req.namespace, req.podName)
  })

  ipcMain.handle(IPC.POD_GET_METRICS, async (_e, req: PodResourceRequest): Promise<PodMetricsResponse> => {
    const clients = clusterManager.get(req.clusterId)
    return getPodMetrics(clients, req.namespace, req.podName)
  })

  ipcMain.handle(IPC.POD_GET_NETWORK, async (_e, req: PodResourceRequest): Promise<PodNetworkResponse> => {
    const clients = clusterManager.get(req.clusterId)
    return getPodNetwork(clients, req.namespace, req.podName)
  })

  ipcMain.handle(IPC.POD_LOGS_START, async (event, req: PodLogsStartRequest) => {
    const clients = clusterManager.get(req.clusterId)
    const sender = event.sender
    sender.once('destroyed', () => podLogManager.stopAllForSender(sender.id))
    await podLogManager.start(req.sessionId, clients, req.namespace, req.podName, req.containerName, sender, {
      tailLines: req.tailLines,
      timestamps: req.timestamps
    })
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_LOGS_STOP, async (_e, req: PodLogsSessionRequest) => {
    podLogManager.stop(req.sessionId)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_LOGS_DOWNLOAD, async (event, req: PodLogsDownloadRequest): Promise<PodLogsDownloadResponse> => {
    const clients = clusterManager.get(req.clusterId)
    const window = BrowserWindow.fromWebContents(event.sender)
    return downloadPodLogs(window, clients, req)
  })

  ipcMain.handle(IPC.POD_EXEC_START, async (event, req: PodExecStartRequest) => {
    const clients = clusterManager.get(req.clusterId)
    const sender = event.sender
    sender.once('destroyed', () => podExecManager.stopAllForSender(sender.id))
    await podExecManager.start(
      req.sessionId,
      clients,
      req.namespace,
      req.podName,
      req.containerName,
      req.cols,
      req.rows,
      sender
    )
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_EXEC_INPUT, async (_e, req: PodExecInputRequest) => {
    podExecManager.input(req.sessionId, req.data)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_EXEC_RESIZE, async (_e, req: PodExecResizeRequest) => {
    podExecManager.resize(req.sessionId, req.cols, req.rows)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_EXEC_STOP, async (_e, req: PodExecSessionRequest) => {
    podExecManager.stop(req.sessionId)
    return { ok: true as const }
  })
}
