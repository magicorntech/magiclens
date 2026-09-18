import type {
  V1DaemonSet,
  V1Deployment,
  V1Ingress,
  V1PodSpec,
  V1Service,
  V1StatefulSet
} from '@kubernetes/client-node'
import type {
  VisualizerEdge,
  VisualizerGraphRequest,
  VisualizerGraphResponse,
  VisualizerHealth,
  VisualizerNode,
  VisualizerNodeKind,
  VisualizerPort
} from '@shared/types/visualizer'
import { isAllNamespaces, parseNamespaceSelection } from '@shared/namespaceSelection'
import { clusterManager } from './clusterManager'

function nodeId(kind: VisualizerNodeKind, namespace: string, name: string): string {
  return `${kind}:${namespace}/${name}`
}

function imagesFromSpec(spec?: V1PodSpec | null): string[] {
  return [...(spec?.containers ?? []), ...(spec?.initContainers ?? [])]
    .map((c) => c.image)
    .filter((image): image is string => Boolean(image))
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

function matchesSelector(
  labels: Record<string, string> | undefined,
  selector: Record<string, string> | undefined
): boolean {
  if (!selector || Object.keys(selector).length === 0) return false
  if (!labels) return false
  return Object.entries(selector).every(([k, v]) => labels[k] === v)
}

function deployHealth(dep: V1Deployment): { status: VisualizerHealth; ready: number; desired: number } {
  const desired = dep.spec?.replicas ?? 0
  const ready = dep.status?.readyReplicas ?? 0
  const unavailable = dep.status?.unavailableReplicas ?? 0
  if (desired === 0) return { status: 'unknown', ready, desired }
  if (ready >= desired && unavailable === 0) return { status: 'healthy', ready, desired }
  if (ready === 0) return { status: 'error', ready, desired }
  return { status: 'degraded', ready, desired }
}

function stsHealth(sts: V1StatefulSet): { status: VisualizerHealth; ready: number; desired: number } {
  const desired = sts.spec?.replicas ?? 0
  const ready = sts.status?.readyReplicas ?? 0
  if (desired === 0) return { status: 'unknown', ready, desired }
  if (ready >= desired) return { status: 'healthy', ready, desired }
  if (ready === 0) return { status: 'error', ready, desired }
  return { status: 'degraded', ready, desired }
}

function dsHealth(ds: V1DaemonSet): { status: VisualizerHealth; ready: number; desired: number } {
  const desired = ds.status?.desiredNumberScheduled ?? 0
  const ready = ds.status?.numberReady ?? 0
  if (desired === 0) return { status: 'unknown', ready, desired }
  if (ready >= desired) return { status: 'healthy', ready, desired }
  if (ready === 0) return { status: 'error', ready, desired }
  return { status: 'degraded', ready, desired }
}

async function settleItems<T>(promise: Promise<{ items?: T[] }>): Promise<T[]> {
  try {
    const res = await promise
    return (res.items ?? []) as T[]
  } catch {
    return []
  }
}

export async function buildVisualizerGraph(
  req: VisualizerGraphRequest
): Promise<VisualizerGraphResponse> {
  const clients = clusterManager.require(req.clusterId)
  const selection = parseNamespaceSelection(req.namespace)
  const clusterWide = selection.length === 0 || isAllNamespaces(selection)
  const namespaces = clusterWide ? null : new Set(selection)

  const [deployments, statefulSets, daemonSets, services, ingresses] = await Promise.all([
    settleItems<V1Deployment>(
      clusterWide
        ? clients.apps.listDeploymentForAllNamespaces()
        : Promise.all(
            selection.map((namespace) => clients.apps.listNamespacedDeployment({ namespace }))
          ).then((rows) => ({ items: rows.flatMap((r) => r.items ?? []) }))
    ),
    settleItems<V1StatefulSet>(
      clusterWide
        ? clients.apps.listStatefulSetForAllNamespaces()
        : Promise.all(
            selection.map((namespace) => clients.apps.listNamespacedStatefulSet({ namespace }))
          ).then((rows) => ({ items: rows.flatMap((r) => r.items ?? []) }))
    ),
    settleItems<V1DaemonSet>(
      clusterWide
        ? clients.apps.listDaemonSetForAllNamespaces()
        : Promise.all(
            selection.map((namespace) => clients.apps.listNamespacedDaemonSet({ namespace }))
          ).then((rows) => ({ items: rows.flatMap((r) => r.items ?? []) }))
    ),
    settleItems<V1Service>(
      clusterWide
        ? clients.core.listServiceForAllNamespaces()
        : Promise.all(
            selection.map((namespace) => clients.core.listNamespacedService({ namespace }))
          ).then((rows) => ({ items: rows.flatMap((r) => r.items ?? []) }))
    ),
    settleItems<V1Ingress>(
      clusterWide
        ? clients.networking.listIngressForAllNamespaces()
        : Promise.all(
            selection.map((namespace) => clients.networking.listNamespacedIngress({ namespace }))
          ).then((rows) => ({ items: rows.flatMap((r) => r.items ?? []) }))
    )
  ])

  function inScope(namespace?: string): boolean {
    if (!namespace) return false
    if (!namespaces) return true
    return namespaces.has(namespace)
  }

  const workloads: Array<{
    id: string
    kind: VisualizerNodeKind
    name: string
    namespace: string
    labels?: Record<string, string>
    images: string[]
    status: VisualizerHealth
    ready: number
    desired: number
  }> = []

  for (const dep of deployments) {
    const name = dep.metadata?.name ?? ''
    const namespace = dep.metadata?.namespace ?? ''
    if (!inScope(namespace) || !name) continue
    const health = deployHealth(dep)
    workloads.push({
      id: nodeId('Deployment', namespace, name),
      kind: 'Deployment',
      name,
      namespace,
      labels: dep.metadata?.labels ?? undefined,
      images: imagesFromSpec(dep.spec?.template?.spec),
      status: health.status,
      ready: health.ready,
      desired: health.desired
    })
  }

  for (const sts of statefulSets) {
    const name = sts.metadata?.name ?? ''
    const namespace = sts.metadata?.namespace ?? ''
    if (!inScope(namespace) || !name) continue
    const health = stsHealth(sts)
    workloads.push({
      id: nodeId('StatefulSet', namespace, name),
      kind: 'StatefulSet',
      name,
      namespace,
      labels: sts.metadata?.labels ?? undefined,
      images: imagesFromSpec(sts.spec?.template?.spec),
      status: health.status,
      ready: health.ready,
      desired: health.desired
    })
  }

  for (const ds of daemonSets) {
    const name = ds.metadata?.name ?? ''
    const namespace = ds.metadata?.namespace ?? ''
    if (!inScope(namespace) || !name) continue
    const health = dsHealth(ds)
    workloads.push({
      id: nodeId('DaemonSet', namespace, name),
      kind: 'DaemonSet',
      name,
      namespace,
      labels: ds.metadata?.labels ?? undefined,
      images: imagesFromSpec(ds.spec?.template?.spec),
      status: health.status,
      ready: health.ready,
      desired: health.desired
    })
  }

  const ingressBackends = new Set<string>()
  for (const ing of ingresses) {
    const namespace = ing.metadata?.namespace ?? ''
    if (!inScope(namespace)) continue
    for (const rule of ing.spec?.rules ?? []) {
      for (const path of rule.http?.paths ?? []) {
        const svcName = path.backend?.service?.name
        if (svcName) ingressBackends.add(`Service:${namespace}/${svcName}`)
      }
    }
    const def = ing.spec?.defaultBackend?.service?.name
    if (def) ingressBackends.add(`Service:${namespace}/${def}`)
  }

  const nodes: VisualizerNode[] = []
  const edges: VisualizerEdge[] = []
  const incoming = new Set<string>()

  for (const svc of services) {
    const name = svc.metadata?.name ?? ''
    const namespace = svc.metadata?.namespace ?? ''
    if (!inScope(namespace) || !name) continue
    if (name === 'kubernetes' && namespace === 'default') continue
    const id = nodeId('Service', namespace, name)
    const ports: VisualizerPort[] = (svc.spec?.ports ?? []).map((p) => ({
      port: p.port,
      name: p.name || p.appProtocol || undefined,
      protocol: p.protocol ?? 'TCP'
    }))
    const selector = svc.spec?.selector
    const matched: string[] = []
    for (const wl of workloads) {
      if (wl.namespace !== namespace) continue
      if (!matchesSelector(wl.labels, selector)) continue
      matched.push(wl.id)
      incoming.add(wl.id)
      edges.push({
        id: `selects:${id}->${wl.id}`,
        source: id,
        target: wl.id
      })
    }
    const instance =
      instanceFromLabels(svc.metadata?.labels) !== 'default'
        ? instanceFromLabels(svc.metadata?.labels)
        : matched.length > 0
          ? instanceFromLabels(workloads.find((w) => w.id === matched[0])?.labels)
          : 'default'
    nodes.push({
      id,
      kind: 'Service',
      name,
      namespace,
      instance,
      status: selector && Object.keys(selector).length > 0 && matched.length === 0 ? 'degraded' : 'healthy',
      images: [],
      serviceType: svc.spec?.clusterIP === 'None' ? 'Headless' : svc.spec?.type || 'ClusterIP',
      ports,
      hasIngress: ingressBackends.has(id),
      hasEgress: matched.length > 0
    })
  }

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
