import net from 'node:net'
import { randomUUID } from 'node:crypto'
import { PortForward } from '@kubernetes/client-node'
import type { PortForwardSession, PortForwardSourceKind } from '@shared/types/portForward'
import { getPortForwardSettings } from '../persistence/appSettings'
import type { ClusterClients } from './clusterManager'

const IDLE_SWEEP_INTERVAL_MS = 30_000

interface StartParams {
  clusterId: string
  clients: ClusterClients
  namespace: string
  sourceKind: PortForwardSourceKind
  sourceName: string
  sourcePort: number
  resolvedPodName: string
  resolvedTargetPort: number
  localPort?: number
  label: string
  senderId: number
}

interface InternalSession extends PortForwardSession {
  server: net.Server
  senderId: number
  /** Local sockets currently attached; the idle clock only starts once this reaches 0. */
  connectionCount: number
}

type StartResult = { ok: true; session: PortForwardSession } | { ok: false; error: string }

function toPublic(session: InternalSession): PortForwardSession {
  const { server: _server, senderId: _senderId, connectionCount: _connectionCount, ...pub } = session
  return pub
}

class PortForwardManager {
  private sessions = new Map<string, InternalSession>()

  private sweepTimer: ReturnType<typeof setInterval> | null = null

  async start(params: StartParams): Promise<StartResult> {
    const pf = new PortForward(params.clients.kc)
    const id = randomUUID()
    // Assigned once the server is listening (before the promise below resolves), and read only
    // from connection handlers that can't fire until then — safe to close over as `let`.
    let session: InternalSession | undefined

    const server = net.createServer((socket) => {
      // Without an error listener, a reset/broken pipe on an individual connection would be
      // an unhandled 'error' event and crash the whole main process.
      socket.on('error', () => socket.destroy())
      if (session) {
        session.connectionCount++
        session.idleSince = null
      }
      socket.once('close', () => {
        if (!session) return
        session.connectionCount = Math.max(0, session.connectionCount - 1)
        if (session.connectionCount === 0) session.idleSince = new Date().toISOString()
      })
      pf.portForward(params.namespace, params.resolvedPodName, [params.resolvedTargetPort], socket, null, socket).catch(
        () => socket.destroy()
      )
    })

    return new Promise((resolve) => {
      const onError = (err: Error): void => {
        server.removeListener('listening', onListening)
        resolve({ ok: false, error: err.message })
      }
      const onListening = (): void => {
        server.removeListener('error', onError)
        const address = server.address()
        const localPort = typeof address === 'object' && address ? address.port : (params.localPort ?? 0)
        session = {
          id,
          clusterId: params.clusterId,
          namespace: params.namespace,
          sourceKind: params.sourceKind,
          sourceName: params.sourceName,
          sourcePort: params.sourcePort,
          resolvedPodName: params.resolvedPodName,
          resolvedTargetPort: params.resolvedTargetPort,
          localPort,
          label: params.label,
          startedAt: new Date().toISOString(),
          idleSince: new Date().toISOString(),
          connectionCount: 0,
          server,
          senderId: params.senderId
        }
        this.sessions.set(id, session)
        this.ensureSweeping()
        server.on('error', () => this.stop(id))
        resolve({ ok: true, session: toPublic(session) })
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(params.localPort ?? 0, '127.0.0.1')
    })
  }

  stop(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    session.server.close()
    this.sessions.delete(id)
  }

  list(clusterId: string): PortForwardSession[] {
    return [...this.sessions.values()].filter((s) => s.clusterId === clusterId).map(toPublic)
  }

  listAll(): PortForwardSession[] {
    return [...this.sessions.values()].map(toPublic)
  }

  private ensureSweeping(): void {
    if (this.sweepTimer) return
    this.sweepTimer = setInterval(() => this.sweepIdle(), IDLE_SWEEP_INTERVAL_MS)
  }

  private sweepIdle(): void {
    const { idleTimeoutMinutes } = getPortForwardSettings()
    if (!idleTimeoutMinutes) return
    const cutoff = Date.now() - idleTimeoutMinutes * 60_000
    for (const [id, session] of this.sessions) {
      if (session.connectionCount > 0 || !session.idleSince) continue
      if (new Date(session.idleSince).getTime() <= cutoff) this.stop(id)
    }
  }

  stopAllForSender(senderId: number): void {
    for (const [id, session] of this.sessions) {
      if (session.senderId === senderId) {
        session.server.close()
        this.sessions.delete(id)
      }
    }
  }

  stopAllForCluster(clusterId: string): void {
    for (const [id, session] of this.sessions) {
      if (session.clusterId === clusterId) {
        session.server.close()
        this.sessions.delete(id)
      }
    }
  }
}

export const portForwardManager = new PortForwardManager()
