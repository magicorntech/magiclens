import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  PortForwardListRequest,
  PortForwardListResponse,
  PortForwardStartPodRequest,
  PortForwardStartResponse,
  PortForwardStartServiceRequest,
  PortForwardStopRequest
} from '@shared/types/portForward'
import { clusterManager } from '../k8s/clusterManager'
import { portForwardManager } from '../k8s/portForwardManager'
import { resolveServiceBackingPod } from '../k8s/serviceService'

export function registerPortForwardHandlers(): void {
  ipcMain.handle(
    IPC.PORT_FORWARD_START_POD,
    async (event, req: PortForwardStartPodRequest): Promise<PortForwardStartResponse> => {
      try {
        const clients = clusterManager.get(req.clusterId)
        const sender = event.sender
        sender.once('destroyed', () => portForwardManager.stopAllForSender(sender.id))
        return await portForwardManager.start({
          clusterId: req.clusterId,
          clients,
          namespace: req.namespace,
          sourceKind: 'pod',
          sourceName: req.podName,
          sourcePort: req.targetPort,
          resolvedPodName: req.podName,
          resolvedTargetPort: req.targetPort,
          localPort: req.localPort,
          label: req.label,
          senderId: sender.id
        })
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.PORT_FORWARD_START_SERVICE,
    async (event, req: PortForwardStartServiceRequest): Promise<PortForwardStartResponse> => {
      try {
        const clients = clusterManager.get(req.clusterId)
        const { podName, targetPort } = await resolveServiceBackingPod(clients, req.namespace, req.serviceName, req.port)
        const sender = event.sender
        sender.once('destroyed', () => portForwardManager.stopAllForSender(sender.id))
        return await portForwardManager.start({
          clusterId: req.clusterId,
          clients,
          namespace: req.namespace,
          sourceKind: 'service',
          sourceName: req.serviceName,
          sourcePort: req.port,
          resolvedPodName: podName,
          resolvedTargetPort: targetPort,
          localPort: req.localPort,
          label: req.label,
          senderId: sender.id
        })
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC.PORT_FORWARD_STOP, async (_e, req: PortForwardStopRequest) => {
    portForwardManager.stop(req.id)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.PORT_FORWARD_LIST, async (_e, req: PortForwardListRequest): Promise<PortForwardListResponse> => {
    return { sessions: portForwardManager.list(req.clusterId) }
  })
}
