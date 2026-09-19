import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  PodDetailResponse,
  PodExecInputRequest,
  PodExecResizeRequest,
  PodExecSessionRequest,
  PodExecStartRequest,
  PodLogsDownloadMergedRequest,
  PodLogsDownloadMergedResponse,
  PodLogsDownloadRequest,
  PodLogsDownloadResponse,
  PodLogsMergedStartRequest,
  PodLogsSessionRequest,
  PodLogsStartRequest,
  PodMetricsResponse,
  PodNetworkResponse,
  NamespacePodMetricsRequest,
  NamespacePodMetricsResponse,
  PodResourceRequest
} from '@shared/types/pod'
import { clusterManager } from '../k8s/clusterManager'
import { demoLogChunk, demoNamespacePodMetrics, demoPodDetail, demoPodMetrics, demoPodNetwork, isDemoCluster } from '../k8s/demoMode'
import { getPodDetail, getPodMetrics, getNamespacePodMetrics, getPodNetwork } from '../k8s/podService'
import { podLogManager } from '../k8s/podLogManager'
import { downloadMergedPodLogs, downloadPodLogs } from '../k8s/podLogDownload'
import { podExecManager } from '../k8s/podExecManager'
import { onSenderDestroyed } from './senderCleanup'

export function registerPodHandlers(): void {
  ipcMain.handle(IPC.POD_GET_DETAIL, async (_e, req: PodResourceRequest): Promise<PodDetailResponse> => {
    if (isDemoCluster(req.clusterId)) return demoPodDetail(req.namespace, req.podName)
    try {
      const clients = clusterManager.require(req.clusterId)
      return await getPodDetail(clients, req.namespace, req.podName)
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.POD_GET_METRICS, async (_e, req: PodResourceRequest): Promise<PodMetricsResponse> => {
    if (isDemoCluster(req.clusterId)) return demoPodMetrics()
    const clients = clusterManager.require(req.clusterId)
    return getPodMetrics(clients, req.clusterId, req.namespace, req.podName)
  })

  ipcMain.handle(
    IPC.POD_GET_NAMESPACE_METRICS,
    async (_e, req: NamespacePodMetricsRequest): Promise<NamespacePodMetricsResponse> => {
      if (isDemoCluster(req.clusterId)) return demoNamespacePodMetrics(req.clusterId)
      const clients = clusterManager.require(req.clusterId)
      return getNamespacePodMetrics(clients, req.clusterId, req.namespace)
    }
  )

  ipcMain.handle(IPC.POD_GET_NETWORK, async (_e, req: PodResourceRequest): Promise<PodNetworkResponse> => {
    if (isDemoCluster(req.clusterId)) return demoPodNetwork()
    const clients = clusterManager.require(req.clusterId)
    return getPodNetwork(clients, req.namespace, req.podName)
  })

  ipcMain.handle(IPC.POD_LOGS_START, async (event, req: PodLogsStartRequest) => {
    if (isDemoCluster(req.clusterId)) {
      event.sender.send(IPC.POD_LOGS_DATA, { sessionId: req.sessionId, chunk: demoLogChunk(req.podName, req.containerName) })
      return { ok: true as const }
    }
    const clients = clusterManager.require(req.clusterId)
    const sender = event.sender
    onSenderDestroyed(sender, 'podLogManager', () => podLogManager.stopAllForSender(sender.id))
    await podLogManager.start(req.sessionId, req.clusterId, clients, req.namespace, req.podName, req.containerName, sender, {
      tailLines: req.tailLines,
      timestamps: req.timestamps,
      sinceTime: req.sinceTime,
      previous: req.previous,
      follow: req.follow
    })
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_LOGS_START_MERGED, async (event, req: PodLogsMergedStartRequest) => {
    if (isDemoCluster(req.clusterId)) {
      for (const pod of req.pods) {
        event.sender.send(IPC.POD_LOGS_DATA, {
          sessionId: req.sessionId,
          chunk: demoLogChunk(pod.podName, pod.containerName),
          source: `${pod.podName}/${pod.containerName}`
        })
      }
      return { ok: true as const }
    }
    const clients = clusterManager.require(req.clusterId)
    const sender = event.sender
    onSenderDestroyed(sender, 'podLogManager', () => podLogManager.stopAllForSender(sender.id))
    await podLogManager.startMerged(req.sessionId, req.clusterId, clients, req.namespace, req.pods, sender, {
      tailLines: req.tailLines,
      timestamps: req.timestamps,
      sinceTime: req.sinceTime,
      previous: req.previous,
      follow: req.follow
    })
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_LOGS_STOP, async (_e, req: PodLogsSessionRequest) => {
    podLogManager.stop(req.sessionId)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.POD_LOGS_DOWNLOAD, async (event, req: PodLogsDownloadRequest): Promise<PodLogsDownloadResponse> => {
    if (isDemoCluster(req.clusterId)) return { ok: false, error: 'Demo workspace is read-only' }
    const clients = clusterManager.require(req.clusterId)
    const window = BrowserWindow.fromWebContents(event.sender)
    return downloadPodLogs(window, clients, req)
  })

  ipcMain.handle(
    IPC.POD_LOGS_DOWNLOAD_MERGED,
    async (event, req: PodLogsDownloadMergedRequest): Promise<PodLogsDownloadMergedResponse> => {
      if (isDemoCluster(req.clusterId)) return { ok: false, error: 'Demo workspace is read-only' }
      const clients = clusterManager.require(req.clusterId)
      const window = BrowserWindow.fromWebContents(event.sender)
      return downloadMergedPodLogs(window, clients, req)
    }
  )

  ipcMain.handle(IPC.POD_EXEC_START, async (event, req: PodExecStartRequest) => {
    if (isDemoCluster(req.clusterId)) return { error: 'Demo workspace is read-only' }
    const clients = clusterManager.require(req.clusterId)
    const sender = event.sender
    onSenderDestroyed(sender, 'podExecManager', () => podExecManager.stopAllForSender(sender.id))
    await podExecManager.start(
      req.sessionId,
      req.clusterId,
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
