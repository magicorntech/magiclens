import { parse } from 'yaml'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type {
  VisualizerEdge,
  VisualizerGraphRequest,
  VisualizerGraphResponse,
  VisualizerHealth,
  VisualizerNode,
  VisualizerNodeKind,
  VisualizerPort
} from '@shared/types/visualizer'
import { ALL_NAMESPACES } from '@shared/namespaceSelection'

function nodeId(kind: VisualizerNodeKind, namespace: string, name: string): string {
  return `${kind}:${namespace}/${name}`
}

function instanceFromLabels(labels?: Record<string, string> | null): string {
  if (!labels) return 'default'
  return (
    labels['app.kubernetes.io/instance'] ||
    labels['app.kubernetes.io/part-of'] ||
    labels['app.kubernetes.io/name'] ||
    labels.app ||
    'default'
  )
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asStringMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(asRecord(v))) {
    if (val === undefined || val === null) continue
    out[k] = typeof val === 'string' ? val : String(val)
  }
  return out
}

function healthFromColor(color: string): VisualizerHealth {
  if (color === 'green' || color === 'success') return 'healthy'
  if (color === 'red' || color === 'error') return 'error'
  if (color === 'gold' || color === 'orange' || color === 'warning') return 'degraded'
  return 'unknown'
}

function parseReady(raw?: string): { ready: number; desired: number } {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(raw?.trim() ?? '')
  if (!m) return { ready: 0, desired: 0 }
  return { ready: Number(m[1]), desired: Number(m[2]) }
}

function imagesFromSpec(spec: Record<string, unknown>): string[] {
  const template = asRecord(spec.template)
  const podSpec = asRecord(template.spec)
  const containers = [
    ...(Array.isArray(podSpec.containers) ? podSpec.containers : []),
    ...(Array.isArray(podSpec.initContainers) ? podSpec.initContainers : [])
  ]
  return containers
    .map((c) => asRecord(c).image)
    .filter((image): image is string => typeof image === 'string' && image.length > 0)
}

function selectorFromSpec(spec: Record<string, unknown>): Record<string, string> {
  const sel = asRecord(spec.selector)
  if (sel.matchLabels) return asStringMap(sel.matchLabels)
  if (!sel.matchExpressions && Object.keys(sel).length > 0) return asStringMap(sel)
  return {}
}

function matchesSelector(
  labels: Record<string, string> | undefined,
  selector: Record<string, string>
): boolean {
  const keys = Object.keys(selector)
  if (keys.length === 0 || !labels) return false
  return keys.every((k) => labels[k] === selector[k])
}

function parsePorts(spec: Record<string, unknown>, fallback?: string): VisualizerPort[] {
  if (Array.isArray(spec.ports)) {
    return (spec.ports as Record<string, unknown>[]).map((p) => ({
      port: Number(p.port) || 0,
      name: typeof p.name === 'string' ? p.name : typeof p.appProtocol === 'string' ? p.appProtocol : undefined,
      protocol: typeof p.protocol === 'string' ? p.protocol : 'TCP'
    }))
  }
  if (!fallback || fallback === '-') return []
  return fallback
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((port) => ({ port, protocol: 'TCP' }))
}

async function listKind(
  clusterId: string,
  kind: ResourceKind,
  namespace: string
): Promise<ResourceListItem[]> {
  const res = await window.api.resource.list({ clusterId, kind, namespace })
  if ('error' in res) return []
  return res.items
}

async function readManifest(
  clusterId: string,
  kind: ResourceKind,
  item: ResourceListItem
): Promise<Record<string, unknown> | null> {
  try {
    const res = await window.api.resource.getManifest({
      clusterId,
      namespace: item.namespace,
      name: item.name,
      target: { type: 'builtin', kind }
    })
    if ('error' in res || !res.yaml) return null
    const obj = parse(res.yaml) as unknown
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  let i = 0
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

/** Build the graph through APIs that already exist in a running Electron preload. */
export async function loadVisualizerGraphViaResources(
  req: VisualizerGraphRequest
): Promise<VisualizerGraphResponse> {
  const namespace = req.namespace || ALL_NAMESPACES
  const [deployments, statefulSets, daemonSets, services, ingresses] = await Promise.all([
    listKind(req.clusterId, 'Deployments', namespace),
    listKind(req.clusterId, 'StatefulSets', namespace),
    listKind(req.clusterId, 'DaemonSets', namespace),
    listKind(req.clusterId, 'Services', namespace),
    listKind(req.clusterId, 'Ingresses', namespace)
  ])

  type WorkloadDraft = {
    id: string
    kind: VisualizerNodeKind
    item: ResourceListItem
    resourceKind: ResourceKind
  }

  const workloadDrafts: WorkloadDraft[] = [
    ...deployments.map((item) => ({
      id: nodeId('Deployment', item.namespace, item.name),
      kind: 'Deployment' as const,
      item,
      resourceKind: 'Deployments' as const
    })),
    ...statefulSets.map((item) => ({
      id: nodeId('StatefulSet', item.namespace, item.name),
      kind: 'StatefulSet' as const,
      item,
      resourceKind: 'StatefulSets' as const
    })),
    ...daemonSets.map((item) => ({
      id: nodeId('DaemonSet', item.namespace, item.name),
      kind: 'DaemonSet' as const,
      item,
      resourceKind: 'DaemonSets' as const
    }))
  ]

  const serviceItems = services.filter((s) => !(s.name === 'kubernetes' && s.namespace === 'default'))

  const [wlManifests, svcManifests, ingManifests] = await Promise.all([
    mapPool(workloadDrafts, 8, (w) => readManifest(req.clusterId, w.resourceKind, w.item)),
    mapPool(serviceItems, 8, (s) => readManifest(req.clusterId, 'Services', s)),
    mapPool(ingresses, 6, (i) => readManifest(req.clusterId, 'Ingresses', i))
  ])

  const workloads = workloadDrafts.map((w, i) => {
    const raw = wlManifests[i] ?? {}
    const meta = asRecord(raw.metadata)
    const spec = asRecord(raw.spec)
    const status = asRecord(raw.status)
    const labels = asStringMap(meta.labels)
    const readyCol = parseReady(w.item.columns.ready)
    const ready = Number(status.readyReplicas ?? status.numberReady ?? readyCol.ready) || readyCol.ready
    const desired =
      Number(spec.replicas ?? status.desiredNumberScheduled ?? readyCol.desired) || readyCol.desired
    return {
      id: w.id,
      kind: w.kind,
      name: w.item.name,
      namespace: w.item.namespace,
      labels,
      images: imagesFromSpec(spec),
      status: healthFromColor(w.item.statusColor),
      ready,
      desired
    }
  })

  const ingressBackends = new Set<string>()
  for (const raw of ingManifests) {
    if (!raw) continue
    const ns = String(asRecord(raw.metadata).namespace ?? '')
    const spec = asRecord(raw.spec)
    for (const rule of Array.isArray(spec.rules) ? spec.rules : []) {
      const http = asRecord(asRecord(rule).http)
      for (const path of Array.isArray(http.paths) ? http.paths : []) {
        const svcName = asRecord(asRecord(asRecord(path).backend).service).name
        if (typeof svcName === 'string' && ns) ingressBackends.add(`Service:${ns}/${svcName}`)
      }
    }
    const def = asRecord(asRecord(spec.defaultBackend).service).name
    if (typeof def === 'string' && ns) ingressBackends.add(`Service:${ns}/${def}`)
  }

  const nodes: VisualizerNode[] = []
  const edges: VisualizerEdge[] = []
  const incoming = new Set<string>()

  serviceItems.forEach((item, i) => {
    const raw = svcManifests[i] ?? {}
    const spec = asRecord(raw.spec)
    const labels = asStringMap(asRecord(raw.metadata).labels)
    const selector = selectorFromSpec(spec)
    const id = nodeId('Service', item.namespace, item.name)
    const matched: string[] = []
    for (const wl of workloads) {
      if (wl.namespace !== item.namespace) continue
      if (!matchesSelector(wl.labels, selector)) continue
      matched.push(wl.id)
      incoming.add(wl.id)
      edges.push({ id: `selects:${id}->${wl.id}`, source: id, target: wl.id })
    }
    const instance =
      instanceFromLabels(labels) !== 'default'
        ? instanceFromLabels(labels)
        : matched[0]
          ? instanceFromLabels(workloads.find((w) => w.id === matched[0])?.labels)
          : 'default'
    nodes.push({
      id,
      kind: 'Service',
      name: item.name,
      namespace: item.namespace,
      instance,
      status: Object.keys(selector).length > 0 && matched.length === 0 ? 'degraded' : 'healthy',
      images: [],
      serviceType: item.columns.type || item.statusText || 'ClusterIP',
      ports: parsePorts(spec, item.columns.ports),
      hasIngress: ingressBackends.has(id),
      hasEgress: matched.length > 0
    })
  })

  for (const wl of workloads) {
    const hooked = incoming.has(wl.id)
    nodes.push({
      id: wl.id,
      kind: wl.kind,
      name: wl.name,
      namespace: wl.namespace,
      instance: instanceFromLabels(wl.labels),
      status: wl.status,
      images: wl.images,
      replicasReady: wl.ready,
      replicasDesired: wl.desired,
      hasIngress: hooked,
      hasEgress: hooked
    })
  }

  return { nodes, edges }
}

export async function loadVisualizerGraph(
  req: VisualizerGraphRequest
): Promise<VisualizerGraphResponse | { error: string }> {
  const dedicated = window.api.visualizer?.getGraph
  if (typeof dedicated === 'function') {
    return dedicated(req)
  }
  try {
    return await loadVisualizerGraphViaResources(req)
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
