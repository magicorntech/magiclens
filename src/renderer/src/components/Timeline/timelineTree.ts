import type { ResourceEventItem } from '@shared/types/resourceEvents'

export type TimelineRangeKey = '1m' | '5m' | '30m' | '1h' | '6h' | '24h' | 'all'
export type EventTone = 'warning' | 'success' | 'normal'
export type EventTypeFilter = 'all' | 'warning' | 'normal'

export const TIMELINE_RANGES: { key: TimelineRangeKey; ms: number }[] = [
  { key: '1m', ms: 60_000 },
  { key: '5m', ms: 5 * 60_000 },
  { key: '30m', ms: 30 * 60_000 },
  { key: '1h', ms: 3_600_000 },
  { key: '6h', ms: 6 * 3_600_000 },
  { key: '24h', ms: 24 * 3_600_000 },
  { key: 'all', ms: 0 }
]

const STRETCH_REASONS = new Set([
  'Unhealthy',
  'BackOff',
  'Failed',
  'FailedScheduling',
  'FailedMount',
  'Pulling',
  'BackoffLimitExceeded',
  'FailedGetResourceMetric'
])

const SUCCESS_REASONS = new Set([
  'Created',
  'Started',
  'Pulled',
  'Killing',
  'Completed',
  'SuccessfulCreate',
  'SuccessfulDelete',
  'SuccessfulAttachVolume',
  'SuccessfulRescale',
  'Scheduled',
  'Sync',
  'ScalingReplicaSet'
])

const KIND_CHILD_ORDER = [
  'Service',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'Job',
  'CronJob',
  'ReplicaSet',
  'ReplicationController',
  'HorizontalPodAutoscaler',
  'PodDisruptionBudget',
  'Pod'
]

export const TIMELINE_KIND_ORDER = [
  'App',
  'Service',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'ReplicaSet',
  'Pod',
  'Job',
  'CronJob',
  'HorizontalPodAutoscaler',
  'PodDisruptionBudget',
  'Node',
  'PersistentVolumeClaim',
  'Ingress',
  'Application',
  'ConfigMap',
  'Secret',
  'Role',
  'RoleBinding',
  'ClusterRole',
  'ClusterRoleBinding'
]

export interface TimelineNode {
  id: string
  kind: string
  name: string
  namespace: string
  synthetic: boolean
  events: ResourceEventItem[]
  children: TimelineNode[]
}

export interface VisibleRow {
  node: TimelineNode
  depth: number
  eventCount: number
  subtitle: string
  hasWarning: boolean
}

export interface TimelineBar {
  event: ResourceEventItem
  tone: EventTone
  left: number
  width: number
  instant: boolean
  lane: number
  lanes: number
}

export function eventTone(event: ResourceEventItem): EventTone {
  if (/warn/i.test(event.type)) return 'warning'
  if (SUCCESS_REASONS.has(event.reason)) return 'success'
  return 'normal'
}

export function eventMoment(event: ResourceEventItem): number {
  const t = parseEventTime(event.lastTimestamp) || parseEventTime(event.firstTimestamp)
  return t || 0
}

function parseEventTime(raw: string | null | undefined): number {
  if (!raw) return 0
  const t = Date.parse(raw)
  if (!Number.isFinite(t) || t < Date.parse('2000-01-01T00:00:00Z')) return 0
  return t
}

export function eventSpan(
  event: ResourceEventItem,
  now: number
): { start: number; end: number; instant: boolean } {
  const first = parseEventTime(event.firstTimestamp)
  const last = parseEventTime(event.lastTimestamp)
  const start = first || last || now
  let end = last || start
  const stretch = /warn/i.test(event.type) || STRETCH_REASONS.has(event.reason)
  if (stretch) end = Math.max(end, now)
  const instant = !stretch && Math.max(0, end - start) < 30_000
  return { start, end: instant ? start : Math.max(start, end), instant }
}

export function resolveRange(
  key: TimelineRangeKey,
  events: ResourceEventItem[],
  now: number
): { start: number; end: number } {
  if (key !== 'all') {
    const ms = TIMELINE_RANGES.find((range) => range.key === key)?.ms ?? 24 * 3_600_000
    return { start: now - ms, end: now }
  }
  let min = now
  for (const event of events) {
    const t = parseEventTime(event.firstTimestamp) || parseEventTime(event.lastTimestamp)
    if (t && t < min) min = t
  }
  if (min >= now) min = now - 3_600_000
  return { start: min, end: now }
}

export function eventOverlapsRange(event: ResourceEventItem, start: number, end: number, now: number): boolean {
  const first = parseEventTime(event.firstTimestamp)
  const last = parseEventTime(event.lastTimestamp)
  if (!first && !last) return true
  const span = eventSpan(event, now)
  const eventEnd = span.instant ? span.start : span.end
  return span.start <= end && eventEnd >= start
}

export function filterEvents(
  events: ResourceEventItem[],
  options: {
    start: number
    end: number
    now: number
    search: string
    namespace: string
    kind: string
    type: EventTypeFilter
  }
): ResourceEventItem[] {
  const q = options.search.trim().toLowerCase()
  return events.filter((event) => {
    if (!eventOverlapsRange(event, options.start, options.end, options.now)) return false
    if (options.namespace && event.involvedNamespace && event.involvedNamespace !== options.namespace) {
      return false
    }
    if (options.kind && event.involvedKind && event.involvedKind !== options.kind) return false
    if (options.type === 'warning' && !/warn/i.test(event.type)) return false
    if (options.type === 'normal' && /warn/i.test(event.type)) return false
    if (!q) return true
    return (
      event.reason.toLowerCase().includes(q) ||
      event.message.toLowerCase().includes(q) ||
      (event.involvedName ?? '').toLowerCase().includes(q) ||
      (event.involvedKind ?? '').toLowerCase().includes(q) ||
      (event.involvedNamespace ?? '').toLowerCase().includes(q)
    )
  })
}

function resourceId(namespace: string, kind: string, name: string): string {
  return `${namespace}/${kind}/${name}`
}

function inferPodParents(name: string): { replicaSet?: string; workload?: string; workloadKind: 'Deployment' | 'StatefulSet' } {
  const ordinal = name.match(/^(.+)-(\d+)$/)
  if (ordinal && ordinal[2].length <= 4) {
    return { workload: ordinal[1], workloadKind: 'StatefulSet' }
  }
  const pod = name.match(/^(.+)-[a-z0-9]{5}$/i)
  if (!pod) return { workloadKind: 'Deployment' }
  const replicaSet = pod[1]
  const deploy = replicaSet.match(/^(.+)-[a-z0-9]{6,10}$/i)
  return {
    replicaSet,
    workload: deploy?.[1],
    workloadKind: 'Deployment'
  }
}

function inferWorkloadFromReplicaSet(name: string): string | undefined {
  return name.match(/^(.+)-[a-z0-9]{6,10}$/i)?.[1]
}

const APP_TREE_KINDS = new Set([
  'Pod',
  'ReplicaSet',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'Service',
  'Job',
  'CronJob',
  'HorizontalPodAutoscaler',
  'PodDisruptionBudget'
])

function isGeneratedId(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{8,12}$/i.test(name.trim())
}

function parseEventObjectName(eventName: string): string {
  if (!eventName) return ''
  const parsed = eventName.replace(/\.[0-9a-f]{6,}$/i, '')
  return parsed && !isGeneratedId(parsed) ? parsed : ''
}

function inferKindFromName(name: string): string {
  if (/^.+-[a-z0-9]{6,10}-[a-z0-9]{5}$/i.test(name)) return 'Pod'
  if (/^.+-\d+$/.test(name)) return 'Pod'
  if (/^.+-[a-z0-9]{6,10}$/i.test(name)) return 'ReplicaSet'
  return ''
}

function nameFromMessage(message: string): string {
  const match = message.match(
    /\b(?:pod|deployment|replicaset|statefulset|daemonset|service|job)[\/\s:=]+['"]?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?)/i
  )
  return match?.[1] ?? ''
}

export function resolveEventResource(event: ResourceEventItem): {
  kind: string
  name: string
  namespace: string
} {
  const namespace = event.involvedNamespace || ''
  let name = event.involvedName || ''
  let kind = event.involvedKind && event.involvedKind !== 'Event' ? event.involvedKind : ''
  if (!name || isGeneratedId(name)) {
    const parsed = parseEventObjectName(event.eventName || '')
    if (parsed) name = parsed
  }
  if (!name || isGeneratedId(name)) {
    const fromMessage = nameFromMessage(event.message || '')
    if (fromMessage) name = fromMessage
  }
  if (!kind) kind = inferKindFromName(name)
  if (!kind && name && !isGeneratedId(name)) kind = 'Deployment'
  if (!name) name = event.involvedName || event.eventName || event.reason || event.id
  if (!kind) kind = event.involvedKind || 'Event'
  return { kind, name, namespace }
}

function appNameForRoot(root: TimelineNode): string {
  if (root.kind === 'Pod') {
    const inferred = inferPodParents(root.name)
    return inferred.workload || inferred.replicaSet || root.name
  }
  if (root.kind === 'ReplicaSet') return inferWorkloadFromReplicaSet(root.name) || root.name
  return root.name
}

function sortChildren(nodes: TimelineNode[]): TimelineNode[] {
  return [...nodes].sort((a, b) => {
    const ai = KIND_CHILD_ORDER.indexOf(a.kind)
    const bi = KIND_CHILD_ORDER.indexOf(b.kind)
    const ao = ai === -1 ? KIND_CHILD_ORDER.length : ai
    const bo = bi === -1 ? KIND_CHILD_ORDER.length : bi
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
}

export function buildTimelineTree(events: ResourceEventItem[]): TimelineNode[] {
  const nodes = new Map<string, TimelineNode>()
  const parentOf = new Map<string, string>()

  function ensure(kind: string, name: string, namespace: string, synthetic = false): TimelineNode {
    const id = resourceId(namespace, kind, name)
    const existing = nodes.get(id)
    if (existing) {
      if (!synthetic) existing.synthetic = false
      return existing
    }
    const created: TimelineNode = {
      id,
      kind,
      name,
      namespace,
      synthetic,
      events: [],
      children: []
    }
    nodes.set(id, created)
    return created
  }

  function attach(child: TimelineNode, parent: TimelineNode): void {
    if (child.id === parent.id || parentOf.has(child.id)) return
    parentOf.set(child.id, parent.id)
    parent.children.push(child)
  }

  for (const event of events) {
    const resource = resolveEventResource(event)
    ensure(resource.kind, resource.name, resource.namespace).events.push(event)
  }

  for (const node of [...nodes.values()]) {
    if (node.kind !== 'Pod') continue
    const inferred = inferPodParents(node.name)
    if (inferred.replicaSet) {
      const rs = ensure('ReplicaSet', inferred.replicaSet, node.namespace, true)
      attach(node, rs)
      if (inferred.workload) {
        const workload = ensure(inferred.workloadKind, inferred.workload, node.namespace, true)
        attach(rs, workload)
      }
      continue
    }
    if (inferred.workload) {
      attach(node, ensure(inferred.workloadKind, inferred.workload, node.namespace, true))
    }
  }

  for (const node of [...nodes.values()]) {
    if (node.kind !== 'ReplicaSet' || parentOf.has(node.id)) continue
    const workload = inferWorkloadFromReplicaSet(node.name)
    if (workload) attach(node, ensure('Deployment', workload, node.namespace, true))
  }

  for (const node of [...nodes.values()]) {
    if (
      node.kind !== 'PodDisruptionBudget' &&
      node.kind !== 'HorizontalPodAutoscaler' &&
      node.kind !== 'Service'
    ) {
      continue
    }
    const owners = ['Deployment', 'StatefulSet', 'DaemonSet']
      .map((kind) => nodes.get(resourceId(node.namespace, kind, node.name)))
      .filter((owner): owner is TimelineNode => !!owner)
    if (node.kind === 'Service') {
      for (const owner of owners) attach(owner, node)
      continue
    }
    if (owners[0]) attach(node, owners[0])
  }

  const roots: TimelineNode[] = []
  for (const node of nodes.values()) {
    if (!parentOf.has(node.id)) roots.push(node)
  }

  const apps: TimelineNode[] = []
  for (const root of sortChildren(roots)) {
    if (root.kind === 'App') {
      apps.push(root)
      continue
    }
    if (!APP_TREE_KINDS.has(root.kind) || isGeneratedId(root.name)) {
      apps.push(root)
      continue
    }
    const app = ensure('App', appNameForRoot(root), root.namespace, true)
    attach(root, app)
    if (!apps.includes(app)) apps.push(app)
  }

  function finalize(node: TimelineNode): void {
    node.children = sortChildren(node.children)
    node.children.forEach(finalize)
  }

  const tree = sortChildren(apps)
  tree.forEach(finalize)
  return tree
}

export function subtreeEventCount(node: TimelineNode): number {
  return node.events.length + node.children.reduce((sum, child) => sum + subtreeEventCount(child), 0)
}

export function subtreeHasWarning(node: TimelineNode): boolean {
  return (
    node.events.some((event) => /warn/i.test(event.type)) || node.children.some(subtreeHasWarning)
  )
}

export function shortAppName(name: string): string {
  return name.replace(/-(?:preprod|prod|staging|dev|pr-\d+)$/i, '')
}

export function rowSubtitle(node: TimelineNode, appName: string): string {
  const short = shortAppName(appName || node.name)
  if (node.kind === 'App') return short
  return short || node.namespace
}

export function flattenTree(roots: TimelineNode[], collapsed: Set<string>): VisibleRow[] {
  const rows: VisibleRow[] = []
  function walk(nodes: TimelineNode[], depth: number, appName: string): void {
    for (const node of nodes) {
      const currentApp = node.kind === 'App' ? node.name : appName
      rows.push({
        node,
        depth,
        eventCount: subtreeEventCount(node),
        subtitle: rowSubtitle(node, currentApp),
        hasWarning: subtreeHasWarning(node)
      })
      if (node.children.length > 0 && !collapsed.has(node.id)) {
        walk(node.children, depth + 1, currentApp)
      }
    }
  }
  walk(roots, 0, '')
  return rows
}

export function collectTreeKinds(roots: TimelineNode[]): string[] {
  const kinds = new Set<string>()
  function walk(nodes: TimelineNode[]): void {
    for (const node of nodes) {
      if (node.kind) kinds.add(node.kind)
      walk(node.children)
    }
  }
  walk(roots)
  return [...kinds]
}

export function filterTreeByNamespace(roots: TimelineNode[], namespace: string): TimelineNode[] {
  if (!namespace) return roots
  function visit(node: TimelineNode): TimelineNode | null {
    const children = node.children.map(visit).filter((child): child is TimelineNode => child !== null)
    if (node.namespace && node.namespace !== namespace) {
      return children.length > 0 ? { ...node, events: [], children } : null
    }
    const events = node.events.filter((event) => event.involvedNamespace === namespace)
    if (events.length === 0 && children.length === 0) return null
    return { ...node, events, children }
  }
  return roots.map(visit).filter((node): node is TimelineNode => node !== null)
}

export function filterTreeByKind(roots: TimelineNode[], kind: string): TimelineNode[] {
  if (!kind) return roots
  function visit(node: TimelineNode): TimelineNode | null {
    if (node.kind === kind) return node
    const children = node.children.map(visit).filter((child): child is TimelineNode => child !== null)
    if (children.length === 0) return null
    return { ...node, children }
  }
  return roots.map(visit).filter((node): node is TimelineNode => node !== null)
}

export function timelineKindOptions(eventKinds: string[], treeKinds: string[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const kind of TIMELINE_KIND_ORDER) {
    if (seen.has(kind)) continue
    seen.add(kind)
    ordered.push(kind)
  }
  for (const kind of [...eventKinds, ...treeKinds].sort((a, b) => a.localeCompare(b))) {
    if (!kind || seen.has(kind)) continue
    seen.add(kind)
    ordered.push(kind)
  }
  return ordered
}

export function uniqueValues(events: ResourceEventItem[], field: 'involvedNamespace' | 'involvedKind'): string[] {
  const values = new Set<string>()
  for (const event of events) {
    const value = event[field]
    if (value) values.add(value)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function densityBuckets(events: ResourceEventItem[], start: number, end: number, count = 72): number[] {
  const buckets = Array.from({ length: count }, () => 0)
  const span = Math.max(1, end - start)
  for (const event of events) {
    const t = eventMoment(event)
    if (t < start || t > end) continue
    const index = Math.min(count - 1, Math.floor(((t - start) / span) * count))
    buckets[index] += event.count || 1
  }
  return buckets
}

export function axisTicks(start: number, end: number): { t: number; label: string }[] {
  const span = Math.max(1, end - start)
  const count = 8
  const ticks: { t: number; label: string }[] = []
  for (let i = 0; i <= count; i++) {
    const t = start + (span * i) / count
    ticks.push({ t, label: formatTick(t, span) })
  }
  return ticks
}

function formatTick(t: number, span: number): string {
  const date = new Date(t)
  if (span <= 48 * 3_600_000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}`
}

export function barsForNode(node: TimelineNode, start: number, end: number, now: number): TimelineBar[] {
  const span = Math.max(1, end - start)
  const toneOrder: Record<EventTone, number> = { success: 0, normal: 1, warning: 2 }
  const bars = node.events
    .map((event) => {
      const range = eventSpan(event, now)
      const left = ((Math.max(start, range.start) - start) / span) * 100
      const right = ((Math.min(end, range.end) - start) / span) * 100
      const width = range.instant ? 0.8 : Math.max(1.2, right - left)
      return {
        event,
        tone: eventTone(event),
        left: Math.min(99.2, Math.max(0, left)),
        width,
        instant: range.instant,
        lane: 0,
        lanes: 1
      }
    })
    .sort((a, b) => a.left - b.left || toneOrder[a.tone] - toneOrder[b.tone])

  const laneEnds: number[] = []
  for (const bar of bars) {
    const barEnd = bar.left + (bar.instant ? 1.2 : bar.width)
    let lane = laneEnds.findIndex((occupied) => occupied <= bar.left + 0.4)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    bar.lane = lane
    laneEnds[lane] = barEnd
  }
  const lanes = Math.max(1, laneEnds.length)
  for (const bar of bars) bar.lanes = lanes
  return bars.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || a.lane - b.lane)
}

export function uniqueResourceCount(events: ResourceEventItem[]): number {
  const ids = new Set<string>()
  for (const event of events) {
    ids.add(resourceId(event.involvedNamespace, event.involvedKind || 'Event', event.involvedName || event.id))
  }
  return ids.size
}
