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
import { clusterManager } from '../k8s/clusterManager'
import { apiVersionOf, K8S_KIND_NAME, resourceRegistry } from '../k8s/resourceRegistry'
import {
  applyResourceManifest,
  createResourceManifests,
  deleteResourceObject,
  readResourceManifest
} from '../k8s/resourceMutationService'
import { resourceWatchManager } from '../k8s/resourceWatchManager'
import { listEventsForObject, listRecentClusterEvents } from '../k8s/eventsService'

function resolveTarget(target: ResourceMutationTarget): { apiVersion: string; kind: string } {
  if (target.type === 'builtin') {
    const gvk = resourceRegistry[target.kind].gvk
    return { apiVersion: apiVersionOf(gvk), kind: K8S_KIND_NAME[target.kind] }
  }
  return { apiVersion: target.apiVersion, kind: target.kind }
}

const watchCleanupRegistered = new WeakSet<Electron.WebContents>()

export function registerResourceHandlers(): void {
  ipcMain.handle(IPC.RESOURCE_LIST, async (_e, req: ResourceListRequest): Promise<ResourceListResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const config = resourceRegistry[req.kind]
      const items = await config.list(clients, req.namespace)
      return { items }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    IPC.RESOURCE_WATCH_START,
    async (event, req: ResourceWatchStartRequest): Promise<ResourceWatchStartResponse> => {
      const sender = event.sender
      if (!watchCleanupRegistered.has(sender)) {
        watchCleanupRegistered.add(sender)
        sender.once('destroyed', () => resourceWatchManager.stopAllForSender(sender.id))
      }
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
      try {
        const clients = clusterManager.get(req.clusterId)
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
        const clients = clusterManager.get(req.clusterId)
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
        const clients = clusterManager.get(req.clusterId)
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
      const clients = clusterManager.get(req.clusterId)
      const { apiVersion, kind } = resolveTarget(req.target)
      await deleteResourceObject(clients, apiVersion, kind, req.name, req.namespace)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RESOURCE_LIST_EVENTS, async (_e, req: ResourceEventsRequest): Promise<ResourceEventsResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const { kind } = resolveTarget(req.target)
      const events = await listEventsForObject(clients, req.namespace, kind, req.name)
      return { events }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RESOURCE_LIST_CLUSTER_EVENTS, async (_e, req: ClusterEventsRequest): Promise<ResourceEventsResponse> => {
    try {
      const clients = clusterManager.get(req.clusterId)
      const events = await listRecentClusterEvents(clients, {
        limit: req.limit,
        involvedObjectKind: req.involvedObjectKind,
        involvedObjectName: req.involvedObjectName
      })
      return { events }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
