import { useEffect, useState } from 'react'
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'
import type { DynamicResourceItem } from '@shared/types/discovery'
import type { ResourceListItem } from '@shared/types/resource'
import type { ResourceWatchEventPayload, ResourceWatchStatus, ResourceWatchTarget } from '@shared/types/resourceWatch'

type WatchableItem = ResourceListItem | DynamicResourceItem

let sessionCounter = 0
function nextSessionId(): string {
  sessionCounter += 1
  return `watch-${Date.now()}-${sessionCounter}-${Math.random().toString(36).slice(2, 7)}`
}

/** Merges a batch of ADDED/MODIFIED/DELETED changes directly into the cached `{ items }` list —
 * never triggers a full relist. Upserts/deletes are applied by id, last-write-wins per batch. */
function applyChanges(prev: unknown, changes: ResourceWatchEventPayload['changes']): { items: WatchableItem[] } {
  const prevItems =
    prev && typeof prev === 'object' && prev !== null && 'items' in (prev as Record<string, unknown>)
      ? ((prev as { items: WatchableItem[] }).items ?? [])
      : []
  const byId = new Map(prevItems.map((item) => [item.id, item]))
  for (const change of changes) {
    if (change.op === 'upsert') byId.set(change.item.id, change.item)
    else byId.delete(change.id)
  }
  return { items: [...byId.values()] }
}

function useWatchSession(
  queryClient: QueryClient,
  queryKey: QueryKey,
  clusterId: string | null,
  namespace: string,
  target: ResourceWatchTarget | null,
  enabled: boolean
): ResourceWatchStatus {
  const [status, setStatus] = useState<ResourceWatchStatus>('disconnected')

  useEffect(() => {
    if (!clusterId || !target || !enabled) {
      setStatus('disconnected')
      return
    }

    let stopped = false
    const sessionId = nextSessionId()
    setStatus('connecting')

    const unsubEvent = window.api.resource.watch.onEvent((payload) => {
      if (payload.sessionId !== sessionId) return
      queryClient.setQueryData(queryKey, (prev: unknown) => applyChanges(prev, payload.changes))
    })

    const unsubStatus = window.api.resource.watch.onStatus((payload) => {
      if (payload.sessionId !== sessionId || stopped) return
      setStatus(payload.status)
    })

    window.api.resource.watch
      .start({ sessionId, clusterId, namespace, target })
      .then((res) => {
        if (stopped) return
        if ('error' in res) setStatus('fallback-polling')
      })
      .catch(() => {
        if (!stopped) setStatus('fallback-polling')
      })

    return () => {
      stopped = true
      unsubEvent()
      unsubStatus()
      void window.api.resource.watch.stop({ sessionId })
    }
    // Target/queryKey are rebuilt from these same primitives on every render, so this is safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId, namespace, JSON.stringify(target), JSON.stringify(queryKey), enabled, queryClient])

  return status
}

/** Live watch for a built-in resource kind (Pods, Deployments, Services, ...). Patches the same
 * `['resource-list', clusterId, namespace, kind]` query cache used by `useResourceList`. */
export function useBuiltinResourceWatch(
  clusterId: string | null,
  namespace: string,
  kind: ResourceKind | null,
  enabled: boolean
): ResourceWatchStatus {
  const queryClient = useQueryClient()
  const target: ResourceWatchTarget | null = kind ? { type: 'builtin', kind } : null
  return useWatchSession(queryClient, ['resource-list', clusterId, namespace, kind], clusterId, namespace, target, enabled)
}

/** Live watch for a CRD/custom/operator resource kind, addressed by GVK. Patches the same
 * `['dynamic-resource-list', ...]` query cache used by `useDynamicResourceList`. */
export function useDynamicResourceWatch(
  clusterId: string | null,
  namespace: string,
  apiVersion: string | null,
  kind: string | null,
  plural: string | null,
  namespaced: boolean,
  enabled: boolean
): ResourceWatchStatus {
  const queryClient = useQueryClient()
  const target: ResourceWatchTarget | null =
    apiVersion && kind && plural ? { type: 'dynamic', apiVersion, kind, plural, namespaced } : null
  return useWatchSession(
    queryClient,
    ['dynamic-resource-list', clusterId, apiVersion, kind, namespaced, namespace],
    clusterId,
    namespace,
    target,
    enabled
  )
}
