import type { WebContents } from 'electron'
import type { ClusterClients } from './clusterManager'
import {
  NODE_DEBUG_NAMESPACE,
  NODE_HOST_SHELL_COMMAND,
  deleteDebugPod,
  ensureNodeDebugPod
} from './nodeExecService'
import { podExecManager } from './podExecManager'

interface NodeSession {
  clients: ClusterClients
  podName: string
}

class NodeExecManager {
  private sessions = new Map<string, NodeSession>()

  async start(
    sessionId: string,
    clients: ClusterClients,
    clusterId: string,
    nodeName: string,
    cols: number,
    rows: number,
    sender: WebContents
  ): Promise<void> {
    const { namespace, podName, containerName } = await ensureNodeDebugPod(clients, nodeName, clusterId)
    this.sessions.set(sessionId, { clients, podName })
    await podExecManager.start(
      sessionId,
      clients,
      namespace,
      podName,
      containerName,
      cols,
      rows,
      sender,
      NODE_HOST_SHELL_COMMAND,
      () => this.cleanupSession(sessionId)
    )
  }

  /** Deletes the debug pod once its exec session ends so it doesn't linger in the cluster. */
  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    this.sessions.delete(sessionId)
    void deleteDebugPod(session.clients, NODE_DEBUG_NAMESPACE, session.podName).catch(() => {
      // best-effort cleanup; a lingering pod will be recreated/reused next time
    })
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
