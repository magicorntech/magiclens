import type { CoreV1Event } from '@kubernetes/client-node'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import type { ClusterClients } from './clusterManager'

function toEventItem(event: CoreV1Event): ResourceEventItem {
  const source = event.source
    ? [event.source.component, event.source.host].filter(Boolean).join('/')
    : '-'

  const lastSeen =
    event.lastTimestamp ??
    event.eventTime ??
    event.series?.lastObservedTime ??
    event.metadata?.creationTimestamp ??
    null

  const firstSeen = event.firstTimestamp ?? event.metadata?.creationTimestamp ?? null

  return {
    id: event.metadata?.uid ?? `${event.metadata?.namespace}/${event.metadata?.name}`,
    type: event.type ?? event.reason ?? 'Normal',
    reason: event.reason ?? '-',
    message: event.message ?? '-',
    count: event.count ?? event.series?.count ?? 1,
    firstTimestamp: firstSeen ? new Date(firstSeen).toISOString() : null,
    lastTimestamp: lastSeen ? new Date(lastSeen).toISOString() : null,
    source: source || '-'
  }
}

function sortEventsNewestFirst(events: ResourceEventItem[]): ResourceEventItem[] {
  return [...events].sort((a, b) => {
    const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0
    const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0
    return tb - ta
  })
}

async function listCoreEvents(
  clients: ClusterClients,
  options: { fieldSelector?: string; maxItems?: number }
): Promise<CoreV1Event[]> {
  const maxItems = options.maxItems ?? 500
  const collected: CoreV1Event[] = []
  let continueToken: string | undefined

  while (collected.length < maxItems) {
    const pageSize = Math.min(100, maxItems - collected.length)
    const res = await clients.core.listEventForAllNamespaces({
      limit: pageSize,
      ...(continueToken ? { _continue: continueToken } : {}),
      ...(options.fieldSelector ? { fieldSelector: options.fieldSelector } : {})
    })
    collected.push(...(res.items ?? []))
    continueToken = res.metadata?._continue
    if (!continueToken || (res.items?.length ?? 0) === 0) break
  }

  return collected
}

export async function listRecentClusterEvents(
  clients: ClusterClients,
  options: { limit?: number; involvedObjectKind?: string; involvedObjectName?: string } = {}
): Promise<ResourceEventItem[]> {
  const fieldParts: string[] = []
  if (options.involvedObjectKind) fieldParts.push(`involvedObject.kind=${options.involvedObjectKind}`)
  if (options.involvedObjectName) fieldParts.push(`involvedObject.name=${options.involvedObjectName}`)
  const fieldSelector = fieldParts.length > 0 ? fieldParts.join(',') : undefined

  const items = await listCoreEvents(clients, {
    fieldSelector,
    maxItems: options.limit ?? 500
  })

  const sorted = sortEventsNewestFirst(items.map(toEventItem))
  return options.limit ? sorted.slice(0, options.limit) : sorted
}

export async function listEventsForObject(
  clients: ClusterClients,
  namespace: string,
  kind: string,
  name: string
): Promise<ResourceEventItem[]> {
  const fieldParts = [`involvedObject.name=${name}`, `involvedObject.kind=${kind}`]
  if (namespace) fieldParts.push(`involvedObject.namespace=${namespace}`)
  const fieldSelector = fieldParts.join(',')

  let items: CoreV1Event[]
  if (namespace) {
    const res = await clients.core.listNamespacedEvent({ namespace, fieldSelector })
    items = res.items ?? []
  } else {
    items = await listCoreEvents(clients, { fieldSelector, maxItems: 200 })
  }

  if (items.length === 0 && kind === 'Node') {
    items = await listCoreEvents(clients, {
      fieldSelector: `involvedObject.name=${name}`,
      maxItems: 200
    })
    items = items.filter((event) => event.involvedObject?.kind === 'Node')
  }

  return sortEventsNewestFirst(items.map(toEventItem))
}
