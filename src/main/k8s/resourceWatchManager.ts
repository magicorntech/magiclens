import type { KubernetesObject, KubernetesListObject } from '@kubernetes/client-node'
import { makeInformer } from '@kubernetes/client-node'
import type { Informer, ObjectCache } from '@kubernetes/client-node'
import type { WebContents } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { DynamicResourceItem } from '@shared/types/discovery'
import type { ResourceListItem } from '@shared/types/resource'
import type {
  ResourceWatchOp,
  ResourceWatchStartRequest,
  ResourceWatchStartResponse,
  ResourceWatchStatus,
  ResourceWatchTarget
} from '@shared/types/resourceWatch'
import type { ClusterClients } from './clusterManager'
import { clusterManager } from './clusterManager'
import { buildWatchPath, resourceRegistry } from './resourceRegistry'
import { listDynamicResourcesRaw, toDynamicItem } from './dynamicResourceService'

type WatchItem = ResourceListItem | DynamicResourceItem

const FLUSH_INTERVAL_MS = 200
const MAX_RETRIES = 5
const NO_RETRY_STATUS_CODES = new Set([401, 403, 404])

function backoffDelay(retryCount: number): number {
  return Math.min(1000 * 2 ** (retryCount - 1), 30_000)
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function statusCodeOf(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const anyErr = err as { statusCode?: number; code?: number }
    return anyErr.statusCode ?? anyErr.code
  }
  return undefined
}

function buildTargetKey(clusterId: string, namespace: string, target: ResourceWatchTarget): string {
  return target.type === 'builtin'
    ? `${clusterId}::${namespace}::builtin::${target.kind}`
    : `${clusterId}::${namespace}::dynamic::${target.apiVersion}::${target.kind}`
}

function buildDynamicWatchPath(
  apiVersion: string,
  plural: string,
  namespaced: boolean,
  namespace: string | 'ALL'
): string {
  const base = apiVersion.includes('/') ? `/apis/${apiVersion}` : `/api/${apiVersion}`
  if (!namespaced || namespace === 'ALL') return `${base}/${plural}`
  return `${base}/namespaces/${encodeURIComponent(namespace)}/${plural}`
}

interface ResolvedTarget {
  path: string
  listPromiseFn: () => Promise<KubernetesListObject<KubernetesObject>>
  toItem: (obj: KubernetesObject) => WatchItem
}

async function resolveTarget(
  clients: ClusterClients,
  namespace: string | 'ALL',
  target: ResourceWatchTarget
): Promise<ResolvedTarget> {
  if (target.type === 'builtin') {
    const config = resourceRegistry[target.kind]
    if (!config) throw new Error(`Unknown resource kind: ${target.kind}`)
    return {
      path: buildWatchPath(config.gvk, namespace),
      listPromiseFn: () => config.listRaw(clients, namespace) as Promise<KubernetesListObject<KubernetesObject>>,
      toItem: config.toItem as ResolvedTarget['toItem']
    }
  }

  return {
    path: buildDynamicWatchPath(target.apiVersion, target.plural, target.namespaced, namespace),
    listPromiseFn: () =>
      listDynamicResourcesRaw(clients, target.apiVersion, target.kind, target.namespaced, namespace),
    toItem: toDynamicItem as ResolvedTarget['toItem']
  }
}

interface WatchSession {
  informer: Informer<KubernetesObject> & ObjectCache<KubernetesObject>
  sender: WebContents
  senderId: number
  clusterId: string
  targetKey: string
  pending: Map<string, ResourceWatchOp>
  flushTimer: NodeJS.Timeout | null
  retryTimer: NodeJS.Timeout | null
  retryCount: number
  stopped: boolean
  lastStatus: ResourceWatchStatus
}

class ResourceWatchManager {
  private sessions = new Map<string, WatchSession>()
  private targetKeyToSessionId = new Map<string, string>()

  async start(req: ResourceWatchStartRequest, sender: WebContents): Promise<ResourceWatchStartResponse> {
    this.stop(req.sessionId)

    const targetKey = buildTargetKey(req.clusterId, req.namespace, req.target)
    const priorSessionId = this.targetKeyToSessionId.get(targetKey)
    if (priorSessionId && priorSessionId !== req.sessionId) {
      // Prevent duplicate watchers for the same cluster/kind/namespace.
      this.stop(priorSessionId)
    }

    let clients: ClusterClients
    try {
      clients = clusterManager.get(req.clusterId)
    } catch (err) {
      return { error: errorMessage(err) }
    }

    let resolved: ResolvedTarget
    try {
      resolved = await resolveTarget(clients, req.namespace, req.target)
    } catch (err) {
      return { error: errorMessage(err) }
    }

    const informer = makeInformer(clients.kc, resolved.path, resolved.listPromiseFn)

    const session: WatchSession = {
      informer,
      sender,
      senderId: sender.id,
      clusterId: req.clusterId,
      targetKey,
      pending: new Map(),
      flushTimer: null,
      retryTimer: null,
      retryCount: 0,
      stopped: false,
      lastStatus: 'connecting'
    }
    this.sessions.set(req.sessionId, session)
    this.targetKeyToSessionId.set(targetKey, req.sessionId)

    const toItem = resolved.toItem
    const onUpsert = (obj: KubernetesObject): void => {
      const item = toItem(obj)
      session.pending.set(item.id, { op: 'upsert', item })
      this.scheduleFlush(req.sessionId)
    }
    const onDelete = (obj: KubernetesObject): void => {
      const item = toItem(obj)
      session.pending.set(item.id, { op: 'delete', id: item.id })
      this.scheduleFlush(req.sessionId)
    }

    informer.on('add', onUpsert)
    informer.on('update', onUpsert)
    informer.on('delete', onDelete)
    informer.on('connect', () => {
      session.retryCount = 0
      this.setStatus(req.sessionId, 'live')
    })
    informer.on('error', (err) => {
      if (session.stopped) return
      const code = statusCodeOf(err)
      const message = errorMessage(err)
      if (code !== undefined && NO_RETRY_STATUS_CODES.has(code)) {
        this.setStatus(req.sessionId, 'fallback-polling', message)
        return
      }
      session.retryCount += 1
      if (session.retryCount > MAX_RETRIES) {
        this.setStatus(req.sessionId, 'fallback-polling', message)
        return
      }
      this.setStatus(req.sessionId, 'reconnecting', message)
      const delay = backoffDelay(session.retryCount)
      session.retryTimer = setTimeout(() => {
        session.retryTimer = null
        if (session.stopped) return
        informer.start().catch((startErr) => this.setStatus(req.sessionId, 'error', errorMessage(startErr)))
      }, delay)
    })

    this.setStatus(req.sessionId, 'connecting')
    informer.start().catch((err) => {
      if (!session.stopped) this.setStatus(req.sessionId, 'error', errorMessage(err))
    })

    return { ok: true }
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.stopped = true
    if (session.flushTimer) clearTimeout(session.flushTimer)
    if (session.retryTimer) clearTimeout(session.retryTimer)
    void session.informer.stop().catch(() => {})
    this.sessions.delete(sessionId)
    if (this.targetKeyToSessionId.get(session.targetKey) === sessionId) {
      this.targetKeyToSessionId.delete(session.targetKey)
    }
  }

  stopAllForSender(senderId: number): void {
    for (const sessionId of [...this.sessions.keys()]) {
      if (this.sessions.get(sessionId)?.senderId === senderId) this.stop(sessionId)
    }
  }

  stopAllForCluster(clusterId: string): void {
    for (const sessionId of [...this.sessions.keys()]) {
      if (this.sessions.get(sessionId)?.clusterId === clusterId) this.stop(sessionId)
    }
  }

  private scheduleFlush(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.flushTimer) return
    session.flushTimer = setTimeout(() => this.flush(sessionId), FLUSH_INTERVAL_MS)
  }

  private flush(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.flushTimer = null
    if (session.pending.size === 0) return
    const changes = [...session.pending.values()]
    session.pending.clear()
    if (!session.sender.isDestroyed()) {
      session.sender.send(IPC.RESOURCE_WATCH_EVENT, { sessionId, changes })
    }
  }

  private setStatus(sessionId: string, status: ResourceWatchStatus, error?: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    if (session.lastStatus === status) return
    session.lastStatus = status
    if (!session.sender.isDestroyed()) {
      session.sender.send(IPC.RESOURCE_WATCH_STATUS, { sessionId, status, error })
    }
  }
}

export const resourceWatchManager = new ResourceWatchManager()
