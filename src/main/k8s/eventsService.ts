import type { CoreV1Event, EventsV1Event, V1Pod } from '@kubernetes/client-node'
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
  const rawSource = event as CoreV1Event & { reportingController?: string; reportingInstance?: string }
  const source = event.source
    ? [event.source.component, event.source.host].filter(Boolean).join('/')
    : [rawSource.reportingController, rawSource.reportingInstance].filter(Boolean).join('/') || '-'

  const rawEvent = event as CoreV1Event & {
    note?: string
    deprecatedLastTimestamp?: Date | string
    deprecatedFirstTimestamp?: Date | string
    deprecatedCount?: number
    reportingController?: string
    reportingInstance?: string
  }
  const lastSeen =
    event.lastTimestamp ??
    event.eventTime ??
    event.series?.lastObservedTime ??
    rawEvent.deprecatedLastTimestamp ??
    event.metadata?.creationTimestamp ??
    null

  const firstSeen =
    event.firstTimestamp ?? rawEvent.deprecatedFirstTimestamp ?? event.metadata?.creationTimestamp ?? null
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
    message: event.message ?? rawEvent.note ?? '-',
    count: event.count ?? event.series?.count ?? rawEvent.deprecatedCount ?? 1,
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

function readContinue(metadata: { _continue?: string; continue?: string } | undefined): string | undefined {
  return metadata?._continue || metadata?.continue || undefined
}

function dedupeEvents(events: CoreV1Event[]): CoreV1Event[] {
  const byId = new Map<string, CoreV1Event>()
  for (const event of events) {
    const id = event.metadata?.uid ?? `${event.metadata?.namespace ?? ''}/${event.metadata?.name ?? ''}`
    if (id) byId.set(id, event)
  }
  return [...byId.values()]
}

/** events.k8s.io/v1 stores the message on `note` and the object on `regarding`. */
export function eventsV1ToCore(event: EventsV1Event): CoreV1Event {
  return {
    metadata: event.metadata,
    type: event.type,
    reason: event.reason,
    message: event.note,
    count: event.series?.count ?? event.deprecatedCount,
    firstTimestamp: event.deprecatedFirstTimestamp,
    lastTimestamp: event.deprecatedLastTimestamp ?? (event.eventTime as unknown as Date),
    eventTime: event.eventTime as unknown as Date,
    series: event.series
      ? { count: event.series.count, lastObservedTime: event.series.lastObservedTime as unknown as Date }
      : undefined,
    involvedObject: event.regarding,
    source: event.deprecatedSource ?? {
      component: event.reportingController,
      host: event.reportingInstance
    }
  }
}

async function pageCoreNamespace(
  clients: ClusterClients,
  namespace: string,
  fieldSelector: string | undefined,
  maxItems: number
): Promise<CoreV1Event[]> {
  const out: CoreV1Event[] = []
  let token: string | undefined
  for (let page = 0; page < 6 && out.length < maxItems; page += 1) {
    const res = await clients.core.listNamespacedEvent({
      namespace,
      limit: Math.min(500, maxItems),
      ...(fieldSelector ? { fieldSelector } : {}),
      ...(token ? { _continue: token } : {})
    })
    out.push(...(res.items ?? []))
    token = readContinue(res.metadata)
    if (!token) break
  }
  return out.slice(0, maxItems)
}

async function pageCoreCluster(
  clients: ClusterClients,
  fieldSelector: string | undefined,
  maxItems: number
): Promise<CoreV1Event[]> {
  const out: CoreV1Event[] = []
  let token: string | undefined
  for (let page = 0; page < 6 && out.length < maxItems; page += 1) {
    const res = await clients.core.listEventForAllNamespaces({
      limit: Math.min(500, maxItems),
      ...(fieldSelector ? { fieldSelector } : {}),
      ...(token ? { _continue: token } : {})
    })
    out.push(...(res.items ?? []))
    token = readContinue(res.metadata)
    if (!token) break
  }
  return out.slice(0, maxItems)
}

async function pageEventsV1Namespace(
  clients: ClusterClients,
  namespace: string,
  fieldSelector: string | undefined,
  maxItems: number
): Promise<CoreV1Event[]> {
  if (!clients.events?.listNamespacedEvent) return []
  const out: CoreV1Event[] = []
  let token: string | undefined
  for (let page = 0; page < 6 && out.length < maxItems; page += 1) {
    const res = await clients.events.listNamespacedEvent({
      namespace,
      limit: Math.min(500, maxItems),
      ...(fieldSelector ? { fieldSelector } : {}),
      ...(token ? { _continue: token } : {})
    })
    out.push(...(res.items ?? []).map(eventsV1ToCore))
    token = readContinue(res.metadata)
    if (!token) break
  }
  return out.slice(0, maxItems)
}

async function pageEventsV1Cluster(
  clients: ClusterClients,
  fieldSelector: string | undefined,
  maxItems: number
): Promise<CoreV1Event[]> {
  if (!clients.events?.listEventForAllNamespaces) return []
  const out: CoreV1Event[] = []
  let token: string | undefined
  for (let page = 0; page < 6 && out.length < maxItems; page += 1) {
    const res = await clients.events.listEventForAllNamespaces({
      limit: Math.min(500, maxItems),
      ...(fieldSelector ? { fieldSelector } : {}),
      ...(token ? { _continue: token } : {})
    })
    out.push(...(res.items ?? []).map(eventsV1ToCore))
    token = readContinue(res.metadata)
    if (!token) break
  }
  return out.slice(0, maxItems)
}

async function listCoreEvents(
  clients: ClusterClients,
  options: { fieldSelector?: string; maxItems?: number }
): Promise<CoreV1Event[]> {
  return pageCoreCluster(clients, options.fieldSelector, options.maxItems ?? 500)
}

async function listNamespacedEvents(
  clients: ClusterClients,
  namespace: string,
  maxItems: number,
  fieldSelector?: string
): Promise<CoreV1Event[]> {
  return pageCoreNamespace(clients, namespace, fieldSelector, maxItems)
}

function matchesObject(event: CoreV1Event, kind: string, name: string): boolean {
  const ref = event.involvedObject
  return ref?.name === name && (!kind || !ref.kind || ref.kind === kind)
}

async function listScoped(
  clients: ClusterClients,
  namespace: string | undefined,
  coreSelector: string | undefined,
  v1Selector: string | undefined,
  maxItems: number,
  kind?: string,
  name?: string
): Promise<CoreV1Event[]> {
  const load = async (useSelector: boolean): Promise<CoreV1Event[]> => {
    const coreField = useSelector ? coreSelector : undefined
    const v1Field = useSelector ? v1Selector : undefined
    if (namespace) {
      const [coreItems, v1Items] = await Promise.all([
        pageCoreNamespace(clients, namespace, coreField, maxItems),
        pageEventsV1Namespace(clients, namespace, v1Field, maxItems)
      ])
      return dedupeEvents([...coreItems, ...v1Items])
    }
    const [coreItems, v1Items] = await Promise.all([
      pageCoreCluster(clients, coreField, maxItems),
      pageEventsV1Cluster(clients, v1Field, maxItems)
    ])
    return dedupeEvents([...coreItems, ...v1Items])
  }

  try {
    return await load(true)
  } catch {
    if (!kind || !name) return []
    try {
      const all = await load(false)
      return all.filter((event) => matchesObject(event, kind, name))
    } catch {
      return []
    }
  }
}

/** Newest warning events are easy to miss when a plain list is ordered by name. */
async function withWarningEvents(
  clients: ClusterClients,
  namespace: string | undefined,
  items: CoreV1Event[],
  maxItems: number
): Promise<CoreV1Event[]> {
  const warnings = await listScoped(clients, namespace, 'type=Warning', 'type=Warning', maxItems).catch(
    () => [] as CoreV1Event[]
  )
  return dedupeEvents([...items, ...warnings])
}

export async function listEventObjects(
  clients: ClusterClients,
  namespace: string | 'ALL'
): Promise<{ items: CoreV1Event[] }> {
  const scoped = namespace === 'ALL' ? undefined : namespace
  const items = await withWarningEvents(
    clients,
    scoped,
    await listScoped(clients, scoped, undefined, undefined, 2000),
    500
  )
  return { items }
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
          const [coreItems, v1Items] = await Promise.all([
            listNamespacedEvents(clients, namespace, perNs, fieldSelector),
            fieldSelector
              ? Promise.resolve([] as CoreV1Event[])
              : pageEventsV1Namespace(clients, namespace, undefined, perNs).catch(() => [] as CoreV1Event[])
          ])
          return dedupeEvents([...coreItems, ...v1Items])
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
    const listed = await listScoped(
      clients,
      options.namespace,
      fieldSelector,
      v1Selector(options.involvedObjectKind, options.involvedObjectName),
      maxItems,
      options.involvedObjectKind,
      options.involvedObjectName
    )
    items = fieldSelector ? listed : await withWarningEvents(clients, options.namespace, listed, maxItems)
  } else if (options.namespaces && options.namespaces.length > 0) {
    items = await listEventsFromNamespaces(clients, options.namespaces, maxItems, fieldSelector)
  } else {
    const listed = await listScoped(
      clients,
      undefined,
      fieldSelector,
      v1Selector(options.involvedObjectKind, options.involvedObjectName),
      maxItems,
      options.involvedObjectKind,
      options.involvedObjectName
    )
    items = fieldSelector ? listed : await withWarningEvents(clients, undefined, listed, maxItems)
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
  if (kind === 'Node') {
    return listEventsOnNode(clients, name)
  }

  const fieldSelector = `involvedObject.name=${name},involvedObject.kind=${kind}`
  const items = await listScoped(clients, namespace || undefined, fieldSelector, v1Selector(kind, name), 200, kind, name)
  const mapped = items.map(toEventItem)
  if (!namespace) return sortEventsNewestFirst(mapped)
  if (kind === 'Pod') {
    const statusEvents = await podStatusEvents(clients, namespace, name).catch(() => [] as ResourceEventItem[])
    return sortEventsNewestFirst(mergeStatusEvents(mapped, statusEvents))
  }
  if (!CONTROLLER_KINDS.has(kind)) return sortEventsNewestFirst(mapped)
  const related = await relatedControllerEvents(clients, namespace, kind, name).catch(() => [] as ResourceEventItem[])
  return sortEventsNewestFirst(dedupeItems([...mapped, ...related]))
}

const CONTROLLER_KINDS = new Set([
  'Deployment',
  'ReplicaSet',
  'ReplicationController',
  'StatefulSet',
  'DaemonSet',
  'Job',
  'CronJob',
  'Service',
  'HorizontalPodAutoscaler'
])

function hasOwner(
  obj: { metadata?: { ownerReferences?: Array<{ kind?: string; name?: string }> } },
  kind: string,
  name: string
): boolean {
  return (obj.metadata?.ownerReferences ?? []).some((owner) => owner.kind === kind && owner.name === name)
}

/** Pods whose controller is one of these objects. Deployment pods are owned by a ReplicaSet. */
export function selectOwnedPods(
  pods: V1Pod[],
  owners: Array<{ kind: string; name: string }>
): V1Pod[] {
  return pods.filter((pod) =>
    (pod.metadata?.ownerReferences ?? []).some((owner) =>
      owners.some((wanted) => wanted.kind === owner.kind && wanted.name === owner.name)
    )
  )
}

async function relatedControllerEvents(
  clients: ClusterClients,
  namespace: string,
  kind: string,
  name: string
): Promise<ResourceEventItem[]> {
  const resolved = await resolveController(clients, namespace, kind, name)
  if (!resolved) return []
  const { pods, refs } = resolved
  const status = pods.flatMap((pod) =>
    podStatusEventsFromPod(pod, namespace, pod.metadata?.name ?? '')
  )
  const lists =
    refs.length > 24
      ? [
          (await listScoped(clients, namespace, undefined, undefined, 800)).filter((event) =>
            refs.some((ref) => event.involvedObject?.name === ref.name && event.involvedObject?.kind === ref.kind)
          )
        ]
      : await mapPool(refs, 6, (ref) =>
          listScoped(
            clients,
            namespace,
            `involvedObject.name=${ref.name},involvedObject.kind=${ref.kind}`,
            v1Selector(ref.kind, ref.name),
            40,
            ref.kind,
            ref.name
          ).catch(() => [] as CoreV1Event[])
        )
  const mapped = lists.flat().map(toEventItem)
  return mergeStatusEvents(mapped, status.filter((row) => row.involvedName))
}

async function resolveController(
  clients: ClusterClients,
  namespace: string,
  kind: string,
  name: string
): Promise<{ pods: V1Pod[]; refs: Array<{ kind: string; name: string }> } | null> {
  if (kind === 'HorizontalPodAutoscaler') {
    const hpa = await clients.autoscaling.readNamespacedHorizontalPodAutoscaler({ name, namespace })
    const target = hpa.spec?.scaleTargetRef
    if (!target?.kind || !target.name || target.kind === 'HorizontalPodAutoscaler') return null
    return resolveController(clients, namespace, target.kind, target.name)
  }
  if (kind === 'Service') {
    const service = await clients.core.readNamespacedService({ name, namespace })
    const selector = service.spec?.selector ?? {}
    const labels = Object.entries(selector).filter((entry) => entry[1])
    if (labels.length === 0) return null
    const listed = await clients.core.listNamespacedPod({
      namespace,
      labelSelector: labels.map(([key, value]) => `${key}=${value}`).join(',')
    })
    const pods = listed.items ?? []
    return {
      pods,
      refs: pods.flatMap((pod) => (pod.metadata?.name ? [{ kind: 'Pod', name: pod.metadata.name }] : []))
    }
  }

  const listed = await clients.core.listNamespacedPod({ namespace })
  const pods = listed.items ?? []
  if (kind === 'Deployment') {
    const replicaSets = await clients.apps.listNamespacedReplicaSet({ namespace })
    const ownedSets = (replicaSets.items ?? []).filter((set) => hasOwner(set, 'Deployment', name))
    const owners = ownedSets.flatMap((set) =>
      set.metadata?.name ? [{ kind: 'ReplicaSet', name: set.metadata.name }] : []
    )
    const ownedPods = selectOwnedPods(pods, owners)
    return { pods: ownedPods, refs: [...owners, ...podRefs(ownedPods)] }
  }
  if (kind === 'CronJob') {
    const jobs = await clients.batch.listNamespacedJob({ namespace })
    const ownedJobs = (jobs.items ?? []).filter((job) => hasOwner(job, 'CronJob', name))
    const owners = ownedJobs.flatMap((job) => (job.metadata?.name ? [{ kind: 'Job', name: job.metadata.name }] : []))
    const ownedPods = selectOwnedPods(pods, owners)
    return { pods: ownedPods, refs: [...owners, ...podRefs(ownedPods)] }
  }
  if (
    kind === 'ReplicaSet' ||
    kind === 'ReplicationController' ||
    kind === 'StatefulSet' ||
    kind === 'DaemonSet' ||
    kind === 'Job'
  ) {
    const ownedPods = selectOwnedPods(pods, [{ kind, name }])
    return { pods: ownedPods, refs: podRefs(ownedPods) }
  }
  return null
}

function podRefs(pods: V1Pod[]): Array<{ kind: string; name: string }> {
  return pods.flatMap((pod) => (pod.metadata?.name ? [{ kind: 'Pod', name: pod.metadata.name }] : []))
}

function dedupeItems(events: ResourceEventItem[]): ResourceEventItem[] {
  const byId = new Map<string, ResourceEventItem>()
  for (const event of events) {
    if (event.id) byId.set(event.id, event)
  }
  return [...byId.values()]
}

function v1Selector(kind?: string, name?: string): string | undefined {
  const parts: string[] = []
  if (name) parts.push(`regarding.name=${name}`)
  if (kind) parts.push(`regarding.kind=${kind}`)
  return parts.length > 0 ? parts.join(',') : undefined
}

const POD_STATUS_REASONS = /^(OOMKilled|Error|Evicted|ContainerCannotRun|StartError|DeadlineExceeded|CrashLoopBackOff|ImagePullBackOff|ErrImagePull|CreateContainerError|RunContainerError)$/i

function statusAlreadyListed(events: ResourceEventItem[], container: string, reason: string): boolean {
  const reasonKey = reason.toLowerCase()
  const containerKey = container.toLowerCase()
  return events.some((event) => {
    const blob = `${event.reason} ${event.message}`.toLowerCase()
    if (reasonKey === 'oomkilled') return /oomkill|out of memory|memory cgroup/.test(blob)
    return blob.includes(reasonKey) && blob.includes(containerKey)
  })
}

/** Container state survives after the Event object expires. OOMKilled lives here. */
export function podStatusEventsFromPod(pod: V1Pod, namespace: string, name: string): ResourceEventItem[] {
  const statuses = [...(pod.status?.containerStatuses ?? []), ...(pod.status?.initContainerStatuses ?? [])]
  const rows: ResourceEventItem[] = []
  for (const status of statuses) {
    const terminated = status.state?.terminated ?? status.lastState?.terminated
    const waiting = status.state?.waiting
    const reason = terminated?.reason || waiting?.reason || ''
    if (!reason || !POD_STATUS_REASONS.test(reason)) continue
    const finished = terminated?.finishedAt ?? terminated?.startedAt ?? null
    const message =
      terminated?.message ||
      waiting?.message ||
      `${status.name} ${reason}${terminated?.exitCode != null ? ` (exit ${terminated.exitCode})` : ''}`
    rows.push({
      id: `pod-status:${namespace}/${name}:${status.name}:${reason}`,
      type: 'Warning',
      reason,
      message,
      count: status.restartCount || 1,
      firstTimestamp: toIso(terminated?.startedAt ?? null),
      lastTimestamp: toIso(finished),
      source: 'kubelet',
      involvedKind: 'Pod',
      involvedName: name,
      involvedNamespace: namespace
    })
  }
  return rows
}

function mergeStatusEvents(events: ResourceEventItem[], statusEvents: ResourceEventItem[]): ResourceEventItem[] {
  const extra = statusEvents.filter((row) => {
    const container = row.id.split(':')[2] ?? ''
    return !statusAlreadyListed(events, container, row.reason)
  })
  return [...events, ...extra]
}

async function podStatusEvents(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<ResourceEventItem[]> {
  const pod = await clients.core.readNamespacedPod({ name, namespace })
  return podStatusEventsFromPod(pod, namespace, name)
}

async function listPodRefsOnNode(
  clients: ClusterClients,
  nodeName: string
): Promise<Array<{ name: string; namespace: string }>> {
  const res = await clients.core.listPodForAllNamespaces({
    fieldSelector: `spec.nodeName=${nodeName}`
  })
  return (res.items ?? [])
    .map((pod) => ({
      name: pod.metadata?.name ?? '',
      namespace: pod.metadata?.namespace ?? ''
    }))
    .filter((pod) => pod.name && pod.namespace)
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      out[index] = await worker(items[index]!)
    }
  })
  await Promise.all(runners)
  return out
}

/** Node object events plus events for every pod currently scheduled on that node. */
async function listEventsOnNode(clients: ClusterClients, nodeName: string): Promise<ResourceEventItem[]> {
  const [nodeEvents, pods] = await Promise.all([
    listCoreEvents(clients, {
      fieldSelector: `involvedObject.name=${nodeName},involvedObject.kind=Node`,
      maxItems: 200
    }).catch(() => [] as CoreV1Event[]),
    listPodRefsOnNode(clients, nodeName).catch(() => [])
  ])
  const podEventLists = await mapPool(pods, 6, async (pod) => {
    try {
      const items = await listScoped(
        clients,
        pod.namespace,
        `involvedObject.name=${pod.name},involvedObject.kind=Pod`,
        `regarding.name=${pod.name},regarding.kind=Pod`,
        40,
        'Pod',
        pod.name
      )
      const mapped = items.map(toEventItem)
      const status = await podStatusEvents(clients, pod.namespace, pod.name).catch(() => [] as ResourceEventItem[])
      return mergeStatusEvents(mapped, status)
    } catch {
      return [] as ResourceEventItem[]
    }
  })
  const byId = new Map<string, ResourceEventItem>()
  for (const event of [...nodeEvents.map(toEventItem), ...podEventLists.flat()]) {
    if (event.id) byId.set(event.id, event)
  }
  return sortEventsNewestFirst([...byId.values()])
}
