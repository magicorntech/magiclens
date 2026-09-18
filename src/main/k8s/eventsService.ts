import type { CoreV1Event } from '@kubernetes/client-node'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import type { ClusterClients } from './clusterManager'

function isGeneratedId(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{8,12}$/i.test(name.trim())
}

function parseEventObjectName(eventName: string): string {
  if (!eventName) return ''
  const parsed = eventName.replace(/\.[0-9a-f]{6,}$/i, '')
  return isGeneratedId(parsed) ? '' : parsed
}

function readObjectRef(event: CoreV1Event): { kind: string; name: string; namespace: string } {
  const raw = event as unknown as Record<string, unknown>
  const ref = (event.involvedObject ?? raw.involved_object ?? raw.regarding ?? event.related) as
    | { kind?: string; name?: string; namespace?: string }
    | undefined
  const meta = event.metadata ?? (raw.metadata as { namespace?: string } | undefined)
  return {
    kind: ref?.kind || '',
    name: ref?.name || '',
    namespace: ref?.namespace || meta?.namespace || ''
  }
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

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
  const involved = readObjectRef(event)
  const eventName = event.metadata?.name ?? ''
  let involvedName =
    involved.name && !isGeneratedId(involved.name)
      ? involved.name
      : parseEventObjectName(eventName) || involved.name
  let involvedKind = involved.kind === 'Event' ? '' : involved.kind
  if (!involvedKind && involvedName && !isGeneratedId(involvedName)) {
    if (/^.+-[a-z0-9]{6,10}-[a-z0-9]{5}$/i.test(involvedName)) involvedKind = 'Pod'
    else if (/^.+-\d+$/.test(involvedName)) involvedKind = 'Pod'
    else if (/^.+-[a-z0-9]{6,10}$/i.test(involvedName)) involvedKind = 'ReplicaSet'
  }

  return {
    id: event.metadata?.uid ?? `${event.metadata?.namespace}/${event.metadata?.name}`,
    type: event.type ?? event.reason ?? 'Normal',
    reason: event.reason ?? '-',
    message: event.message ?? '-',
    count: event.count ?? event.series?.count ?? 1,
    firstTimestamp: toIso(firstSeen),
    lastTimestamp: toIso(lastSeen),
    source: source || '-',
    involvedKind,
    involvedName: involvedName,
    involvedNamespace: involved.namespace || event.metadata?.namespace || '',
    eventName
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
  const res = await clients.core.listEventForAllNamespaces({
    limit: options.maxItems ?? 400,
    ...(options.fieldSelector ? { fieldSelector: options.fieldSelector } : {})
  })
  return res.items ?? []
}

async function listNamespacedEvents(
  clients: ClusterClients,
  namespace: string,
  maxItems: number,
  fieldSelector?: string
): Promise<CoreV1Event[]> {
  const res = await clients.core.listNamespacedEvent({
    namespace,
    limit: maxItems,
    ...(fieldSelector ? { fieldSelector } : {})
  })
  return res.items ?? []
}

async function listEventsFromNamespaces(
  clients: ClusterClients,
  namespaces: string[],
  maxItems: number,
  fieldSelector?: string
): Promise<CoreV1Event[]> {
  const unique = [...new Set(namespaces.filter(Boolean))]
  const perNs = Math.min(200, Math.max(80, Math.ceil(maxItems / Math.min(unique.length, 6))))
  const collected: CoreV1Event[] = []
  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8)
    const pages = await Promise.all(
      batch.map(async (namespace) => {
        try {
          return await listNamespacedEvents(clients, namespace, perNs, fieldSelector)
        } catch {
          return []
        }
      })
    )
    collected.push(...pages.flat())
  }
  return collected
}

export async function listRecentClusterEvents(
  clients: ClusterClients,
  options: {
    limit?: number
    involvedObjectKind?: string
    involvedObjectName?: string
    namespace?: string
    namespaces?: string[]
  } = {}
): Promise<ResourceEventItem[]> {
  const maxItems = Math.min(options.limit ?? 400, 500)
  const fieldParts: string[] = []
  if (options.involvedObjectKind) fieldParts.push(`involvedObject.kind=${options.involvedObjectKind}`)
  if (options.involvedObjectName) fieldParts.push(`involvedObject.name=${options.involvedObjectName}`)
  const fieldSelector = fieldParts.length > 0 ? fieldParts.join(',') : undefined

  let items: CoreV1Event[]
  if (options.namespace) {
    items = await listNamespacedEvents(clients, options.namespace, maxItems, fieldSelector)
  } else if (options.namespaces && options.namespaces.length > 0) {
    items = await listEventsFromNamespaces(clients, options.namespaces, maxItems, fieldSelector)
  } else {
    items = await listCoreEvents(clients, { fieldSelector, maxItems })
  }

  const mapped = sortEventsNewestFirst(items.map(toEventItem))
  if (!options.namespace) return mapped.slice(0, maxItems)
  return mapped
    .map((event) =>
      event.involvedNamespace ? event : { ...event, involvedNamespace: options.namespace as string }
    )
    .filter((event) => !event.involvedNamespace || event.involvedNamespace === options.namespace)
    .slice(0, maxItems)
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
