import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ResourceListRequest, ResourceListResponse } from '@shared/types/resource'
import type { ResourceEventsRequest, ResourceEventsResponse, ClusterEventsRequest } from '@shared/types/resourceEvents'
import type {
  ResourceWatchSessionRequest,
  ResourceWatchStartRequest,
  ResourceWatchStartResponse
} from '@shared/types/resourceWatch'
import type {
  ResourceApplyManifestRequest,
  ResourceApplyManifestResponse,
  ResourceCreateManifestRequest,
  ResourceCreateManifestResponse,
  ResourceDeleteRequest,
  ResourceDeleteResponse,
  ResourceGetManifestRequest,
  ResourceGetManifestResponse,
  ResourceMutationTarget
} from '@shared/types/resourceMutation'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import { clusterManager } from '../k8s/clusterManager'
import { withClusterClients } from '../k8s/withClusterClients'
import { apiVersionOf, K8S_KIND_NAME, resourceRegistry } from '../k8s/resourceRegistry'
import {
  applyResourceManifest,
  createResourceManifests,
  deleteResourceObject,
  readResourceManifest
} from '../k8s/resourceMutationService'
import { resourceWatchManager } from '../k8s/resourceWatchManager'
import { listEventsForObject, listRecentClusterEvents } from '../k8s/eventsService'
import { onSenderDestroyed } from './senderCleanup'
import { getDemoManifest, isDemoCluster, listDemoResources, demoClusterEvents } from '../k8s/demoMode'

function resolveTarget(target: ResourceMutationTarget): { apiVersion: string; kind: string } {
  if (target.type === 'builtin') {
    const gvk = resourceRegistry[target.kind].gvk
    return { apiVersion: apiVersionOf(gvk), kind: K8S_KIND_NAME[target.kind] }
  }
  return { apiVersion: target.apiVersion, kind: target.kind }
}

export function registerResourceHandlers(): void {
  ipcMain.handle(IPC.RESOURCE_LIST, async (_e, req: ResourceListRequest): Promise<ResourceListResponse> => {
    if (isDemoCluster(req.clusterId)) {
      return { items: listDemoResources(req.kind, req.namespace, req.clusterId) }
    }
    try {
      const result = await withClusterClients(req.clusterId, async (clients) => {
        const config = resourceRegistry[req.kind]
        const items = await config.list(clients, req.namespace)
        return { items }
      })
      if ('error' in result) return { error: CLUSTER_NOT_CONNECTED }
      return result
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    IPC.RESOURCE_WATCH_START,
    async (event, req: ResourceWatchStartRequest): Promise<ResourceWatchStartResponse> => {
      if (isDemoCluster(req.clusterId)) {
        return { error: 'demo' }
      }
      const sender = event.sender
      onSenderDestroyed(sender, 'resourceWatchManager', () => resourceWatchManager.stopAllForSender(sender.id))
      return resourceWatchManager.start(req, sender)
    }
  )

  ipcMain.handle(IPC.RESOURCE_WATCH_STOP, async (_e, req: ResourceWatchSessionRequest) => {
    resourceWatchManager.stop(req.sessionId)
    return { ok: true as const }
  })

  ipcMain.handle(
    IPC.RESOURCE_GET_MANIFEST,
    async (_e, req: ResourceGetManifestRequest): Promise<ResourceGetManifestResponse> => {
      if (isDemoCluster(req.clusterId)) {
        const kind = req.target.type === 'builtin' ? req.target.kind : req.target.kind
        return { yaml: getDemoManifest(kind, req.name, req.namespace) }
      }
      try {
        const clients = clusterManager.require(req.clusterId)
        const { apiVersion, kind } = resolveTarget(req.target)
        const yaml = await readResourceManifest(clients, apiVersion, kind, req.name, req.namespace)
        return { yaml }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.RESOURCE_APPLY_MANIFEST,
    async (_e, req: ResourceApplyManifestRequest): Promise<ResourceApplyManifestResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        return await applyResourceManifest(clients, req.yaml)
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.RESOURCE_CREATE_MANIFEST,
    async (_e, req: ResourceCreateManifestRequest): Promise<ResourceCreateManifestResponse> => {
      try {
        const clients = clusterManager.require(req.clusterId)
        const { created, errors } = await createResourceManifests(clients, req.yaml)
        if (errors.length > 0) {
          return { error: errors.join('; '), created }
        }
        return { created }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err), created: [] }
      }
    }
  )

  ipcMain.handle(IPC.RESOURCE_DELETE, async (_e, req: ResourceDeleteRequest): Promise<ResourceDeleteResponse> => {
    try {
      const clients = clusterManager.require(req.clusterId)
      const { apiVersion, kind } = resolveTarget(req.target)
      await deleteResourceObject(clients, apiVersion, kind, req.name, req.namespace)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RESOURCE_LIST_EVENTS, async (_e, req: ResourceEventsRequest): Promise<ResourceEventsResponse> => {
    if (isDemoCluster(req.clusterId)) return { events: [] }
    try {
      const clients = clusterManager.require(req.clusterId)
      const { kind } = resolveTarget(req.target)
      const events = await listEventsForObject(clients, req.namespace, kind, req.name)
      return { events }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RESOURCE_LIST_CLUSTER_EVENTS, async (_e, req: ClusterEventsRequest): Promise<ResourceEventsResponse> => {
    if (isDemoCluster(req.clusterId)) {
      const events = demoClusterEvents(req.clusterId).filter((event) => {
        if (req.namespace) return event.involvedNamespace === req.namespace
        if (req.namespaces?.length) return req.namespaces.includes(event.involvedNamespace)
        return true
      })
      return { events }
    }
    try {
      const clients = clusterManager.require(req.clusterId)
      const events = await listRecentClusterEvents(clients, {
        limit: req.limit,
        involvedObjectKind: req.involvedObjectKind,
        involvedObjectName: req.involvedObjectName,
        namespace: req.namespace,
        namespaces: req.namespaces
      })
      return { events }
    } catch (err) {
      return { error: formatClusterEventsError(err) }
    }
  })
}

function formatClusterEventsError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/ETIMEDOUT|ECONNRESET|ENETUNREACH|timed out|timeout/i.test(message)) {
    return 'Cluster events timed out. Choose a namespace and retry — listing events for the whole cluster is often slow on GKE.'
  }
  return message
}
