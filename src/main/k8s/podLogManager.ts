import { Writable } from 'node:stream'
import type { WebContents } from 'electron'
import { Log } from '@kubernetes/client-node'
import { IPC } from '@shared/ipc-contract'
import type { ClusterClients } from './clusterManager'

interface LogSession {
  abort: AbortController
  senderId: number
}

class PodLogManager {
  private sessions = new Map<string, LogSession>()

  async start(
    sessionId: string,
    clients: ClusterClients,
    namespace: string,
    podName: string,
    containerName: string,
    sender: WebContents,
    options: { tailLines?: number; timestamps?: boolean }
  ): Promise<void> {
    this.stop(sessionId)

    const logApi = new Log(clients.kc)
    const writable = new Writable({
      write: (chunk: Buffer, _enc, callback) => {
        if (!sender.isDestroyed()) {
          sender.send(IPC.POD_LOGS_DATA, { sessionId, chunk: chunk.toString('utf-8') })
        }
        callback()
      }
    })

    let abort: AbortController
    try {
      abort = await logApi.log(namespace, podName, containerName, writable, {
        follow: true,
        tailLines: options.tailLines ?? 200,
        timestamps: options.timestamps ?? false
      })
    } catch (err) {
      if (!sender.isDestroyed()) {
        sender.send(IPC.POD_LOGS_ENDED, { sessionId, error: err instanceof Error ? err.message : String(err) })
      }
      return
    }

    this.sessions.set(sessionId, { abort, senderId: sender.id })

    const finish = (error?: string): void => {
      if (this.sessions.get(sessionId)?.abort === abort) {
        this.sessions.delete(sessionId)
        if (!sender.isDestroyed()) {
          sender.send(IPC.POD_LOGS_ENDED, { sessionId, error })
        }
      }
    }

    // Aborting mid-stream can surface as an 'error' rather than a clean 'close'; without a
    // listener here Node treats it as unhandled and crashes the whole process.
    writable.on('error', (err) => finish(err instanceof Error ? err.message : String(err)))
    writable.on('close', () => finish())
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.abort.abort()
    this.sessions.delete(sessionId)
  }

  stopAllForSender(senderId: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.senderId === senderId) {
        session.abort.abort()
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const podLogManager = new PodLogManager()
