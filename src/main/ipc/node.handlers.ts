import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  NodeExecInputRequest,
  NodeExecResizeRequest,
  NodeExecSessionRequest,
  NodeExecStartRequest
} from '@shared/types/node'
import { clusterManager } from '../k8s/clusterManager'
import { nodeExecManager } from '../k8s/nodeExecManager'

export function registerNodeHandlers(): void {
  ipcMain.handle(IPC.NODE_EXEC_START, async (event, req: NodeExecStartRequest) => {
    const clients = clusterManager.get(req.clusterId)
    const sender = event.sender
    sender.once('destroyed', () => nodeExecManager.stopAllForSender(sender.id))
    await nodeExecManager.start(req.sessionId, clients, req.nodeName, req.cols, req.rows, sender)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.NODE_EXEC_INPUT, async (_e, req: NodeExecInputRequest) => {
    nodeExecManager.input(req.sessionId, req.data)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.NODE_EXEC_RESIZE, async (_e, req: NodeExecResizeRequest) => {
    nodeExecManager.resize(req.sessionId, req.cols, req.rows)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.NODE_EXEC_STOP, async (_e, req: NodeExecSessionRequest) => {
    nodeExecManager.stop(req.sessionId)
    return { ok: true as const }
  })
}
