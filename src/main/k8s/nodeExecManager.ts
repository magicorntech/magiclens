import type { WebContents } from 'electron'
import type { ClusterClients } from './clusterManager'
import { NODE_HOST_SHELL_COMMAND, ensureNodeDebugPod } from './nodeExecService'
import { podExecManager } from './podExecManager'

class NodeExecManager {
  async start(
    sessionId: string,
    clients: ClusterClients,
    nodeName: string,
    cols: number,
    rows: number,
    sender: WebContents
  ): Promise<void> {
    const { namespace, podName, containerName } = await ensureNodeDebugPod(clients, nodeName)
    await podExecManager.start(
      sessionId,
      clients,
      namespace,
      podName,
      containerName,
      cols,
      rows,
      sender,
      NODE_HOST_SHELL_COMMAND
    )
  }

  input(sessionId: string, data: string): void {
    podExecManager.input(sessionId, data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    podExecManager.resize(sessionId, cols, rows)
  }

  stop(sessionId: string): void {
    podExecManager.stop(sessionId)
  }

  stopAllForSender(senderId: number): void {
    podExecManager.stopAllForSender(senderId)
  }
}

export const nodeExecManager = new NodeExecManager()
