import { Writable } from 'node:stream'
import type { WebContents } from 'electron'
import { Log } from '@kubernetes/client-node'
import { IPC } from '@shared/ipc-contract'
import type { ClusterClients } from './clusterManager'

interface LogSession {
  abort: AbortController
  senderId: number
}

export interface PodLogStreamOptions {
  tailLines?: number
  timestamps?: boolean
  sinceTime?: string
  previous?: boolean
  follow?: boolean
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
    options: PodLogStreamOptions
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
        follow: options.follow ?? true,
        tailLines: options.tailLines,
        timestamps: options.timestamps ?? false,
        sinceTime: options.sinceTime,
        previous: options.previous ?? false
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
