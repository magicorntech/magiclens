import type { CoreV1Event } from '@kubernetes/client-node'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import type { ClusterClients } from './clusterManager'

function toEventItem(event: CoreV1Event): ResourceEventItem {
  const source = event.source
    ? [event.source.component, event.source.host].filter(Boolean).join('/')
    : '-'

  return {
    id: event.metadata?.uid ?? `${event.metadata?.namespace}/${event.metadata?.name}`,
    type: event.type ?? 'Normal',
    reason: event.reason ?? '-',
    message: event.message ?? '-',
    count: event.count ?? 1,
    firstTimestamp: event.firstTimestamp ? new Date(event.firstTimestamp).toISOString() : null,
    lastTimestamp: event.lastTimestamp ? new Date(event.lastTimestamp).toISOString() : null,
    source: source || '-'
  }
}

export async function listRecentClusterEvents(
  clients: ClusterClients,
  options: { limit?: number; involvedObjectKind?: string; involvedObjectName?: string } = {}
): Promise<ResourceEventItem[]> {
  const fieldParts: string[] = []
  if (options.involvedObjectKind) fieldParts.push(`involvedObject.kind=${options.involvedObjectKind}`)
  if (options.involvedObjectName) fieldParts.push(`involvedObject.name=${options.involvedObjectName}`)
  const fieldSelector = fieldParts.length > 0 ? fieldParts.join(',') : undefined

  const res = await clients.core.listEventForAllNamespaces({
    limit: options.limit ?? 100,
    ...(fieldSelector ? { fieldSelector } : {})
  })

  return res.items
    .map(toEventItem)
    .sort((a, b) => {
      const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0
      const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0
      return tb - ta
    })
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

  const res = namespace
    ? await clients.core.listNamespacedEvent({ namespace, fieldSelector })
    : await clients.core.listEventForAllNamespaces({ fieldSelector })

  return res.items
    .map(toEventItem)
    .sort((a, b) => {
      const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0
      const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0
      return tb - ta
    })
}
