import { Writable } from 'node:stream'
import type { WebContents } from 'electron'
import { Log } from '@kubernetes/client-node'
import { IPC } from '@shared/ipc-contract'
import type { PodLogsSource } from '@shared/types/pod'
import type { ClusterClients } from './clusterManager'

interface LogSession {
  abort: AbortController
  senderId: number
  clusterId: string
}

interface MergedLogSession {
  aborts: AbortController[]
  senderId: number
  clusterId: string
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
  private mergedSessions = new Map<string, MergedLogSession>()

  async start(
    sessionId: string,
    clusterId: string,
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

    this.sessions.set(sessionId, { abort, senderId: sender.id, clusterId })

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
    if (session) {
      session.abort.abort()
      this.sessions.delete(sessionId)
    }
    this.stopMerged(sessionId)
  }

  /**
   * Tails several pod/container pairs as one logical stream — used by the workload "Logs" tab
   * to show all replicas of a Deployment/StatefulSet/etc. interleaved. Each chunk is tagged with
   * `source` (`"podName/containerName"`) so the renderer can prefix/color lines per pod without
   * the main process having to do line-aware buffering across arbitrary chunk boundaries.
   */
  async startMerged(
    sessionId: string,
    clusterId: string,
    clients: ClusterClients,
    namespace: string,
    pods: PodLogsSource[],
    sender: WebContents,
    options: PodLogStreamOptions
  ): Promise<void> {
    this.stopMerged(sessionId)

    if (pods.length === 0) {
      if (!sender.isDestroyed()) sender.send(IPC.POD_LOGS_ENDED, { sessionId, error: 'No pods to tail' })
      return
    }

    const logApi = new Log(clients.kc)
    const aborts: AbortController[] = []
    let remaining = pods.length
    let lastError: string | undefined

    const finishOne = (error?: string): void => {
      if (error) lastError = error
      remaining -= 1
      if (remaining <= 0) {
        this.mergedSessions.delete(sessionId)
        if (!sender.isDestroyed()) {
          sender.send(IPC.POD_LOGS_ENDED, {
            sessionId,
            error: aborts.length === 0 ? lastError : undefined
          })
        }
      }
    }

    await Promise.all(
      pods.map(async ({ podName, containerName }) => {
        const source = `${podName}/${containerName}`
        const writable = new Writable({
          write: (chunk: Buffer, _enc, callback) => {
            if (!sender.isDestroyed()) {
              sender.send(IPC.POD_LOGS_DATA, { sessionId, chunk: chunk.toString('utf-8'), source })
            }
            callback()
          }
        })

        try {
          const abort = await logApi.log(namespace, podName, containerName, writable, {
            follow: options.follow ?? true,
            tailLines: options.tailLines,
            timestamps: options.timestamps ?? false,
            sinceTime: options.sinceTime,
            previous: options.previous ?? false
          })
          aborts.push(abort)
          writable.on('error', (err) => finishOne(err instanceof Error ? err.message : String(err)))
          writable.on('close', () => finishOne())
        } catch (err) {
          // One pod failing to start (e.g. mid-restart) shouldn't stop the others from tailing.
          finishOne(err instanceof Error ? err.message : String(err))
        }
      })
    )

    if (aborts.length > 0 && remaining > 0) {
      this.mergedSessions.set(sessionId, { aborts, senderId: sender.id, clusterId })
    }
  }

  stopMerged(sessionId: string): void {
    const session = this.mergedSessions.get(sessionId)
    if (!session) return
    for (const abort of session.aborts) abort.abort()
    this.mergedSessions.delete(sessionId)
  }

  stopAllForSender(senderId: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.senderId === senderId) {
        session.abort.abort()
        this.sessions.delete(sessionId)
      }
    }
    for (const [sessionId, session] of this.mergedSessions) {
      if (session.senderId === senderId) {
        for (const abort of session.aborts) abort.abort()
        this.mergedSessions.delete(sessionId)
      }
    }
  }

  stopAllForCluster(clusterId: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.clusterId === clusterId) {
        session.abort.abort()
        this.sessions.delete(sessionId)
      }
    }
    for (const [sessionId, session] of this.mergedSessions) {
      if (session.clusterId === clusterId) {
        for (const abort of session.aborts) abort.abort()
        this.mergedSessions.delete(sessionId)
      }
    }
  }
}

export const podLogManager = new PodLogManager()
