import type {
  V1ConfigMap,
  V1Deployment,
  V1Ingress,
  V1Pod,
  V1ReplicaSet,
  V1Service,
  V1StatefulSet
} from '@kubernetes/client-node'
import type {
  TopologyApplication,
  TopologyEdge,
  TopologyGraphRequest,
  TopologyGraphResponse,
  TopologyHealth,
  TopologyNode,
  TopologyNodeKind
} from '@shared/types/topology'
import { clusterManager } from './clusterManager'
import { derivePodStatus } from './podStatus'
import { getPrometheusStatus, prometheusQuery } from './prometheusService'

function nodeId(kind: TopologyNodeKind, namespace: string, name: string): string {
  return `${kind}:${namespace}/${name}`
}

function colorToHealth(color: string): TopologyHealth {
  if (color === 'green' || color === 'success') return 'healthy'
  if (color === 'red' || color === 'error') return 'error'
  if (color === 'gold' || color === 'orange' || color === 'warning') return 'degraded'
  return 'unknown'
}

function worstHealth(a: TopologyHealth, b: TopologyHealth): TopologyHealth {
  const rank: Record<TopologyHealth, number> = { healthy: 0, unknown: 1, degraded: 2, error: 3 }
  return rank[a] >= rank[b] ? a : b
}

function appNameFromLabels(labels?: Record<string, string> | null): string | null {
  if (!labels) return null
  return (
    labels['app.kubernetes.io/name'] ||
    labels.app ||
    labels['app.kubernetes.io/instance'] ||
    null
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

function parseDependsOn(annotations?: Record<string, string>): Array<{
  kind: string
  name: string
  host?: string
}> {
  if (!annotations) return []
  const raw = annotations['magiclens.io/depends-on'] || annotations['magiclens.io/external-db']
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const fields: Record<string, string> = {}
      for (const token of part.split(';')) {
        const [k, ...rest] = token.split('=')
        if (!k || rest.length === 0) continue
        fields[k.trim().toLowerCase()] = rest.join('=').trim()
      }
      const name = fields.name || fields.host || part
      return {
        kind: fields.kind || 'database',
        name,
        host: fields.host
      }
    })
}

function configMapsFromPod(pod: V1Pod): string[] {
  const names = new Set<string>()
  for (const vol of pod.spec?.volumes ?? []) {
    if (vol.configMap?.name) names.add(vol.configMap.name)
  }
  for (const c of [...(pod.spec?.containers ?? []), ...(pod.spec?.initContainers ?? [])]) {
    for (const env of c.env ?? []) {
      if (env.valueFrom?.configMapKeyRef?.name) names.add(env.valueFrom.configMapKeyRef.name)
    }
    for (const from of c.envFrom ?? []) {
      if (from.configMapRef?.name) names.add(from.configMapRef.name)
    }
  }
  return [...names]
}

function deployHealth(dep: V1Deployment): { status: TopologyHealth; detail?: string } {
  const desired = dep.spec?.replicas ?? 0
  const ready = dep.status?.readyReplicas ?? 0
  const unavailable = dep.status?.unavailableReplicas ?? 0
  if (desired === 0) return { status: 'unknown', detail: 'Scaled to zero' }
  if (ready >= desired && unavailable === 0) return { status: 'healthy' }
  if (ready === 0) return { status: 'error', detail: `0/${desired} ready` }
  return { status: 'degraded', detail: `${ready}/${desired} ready` }
}

function stsHealth(sts: V1StatefulSet): { status: TopologyHealth; detail?: string } {
  const desired = sts.spec?.replicas ?? 0
  const ready = sts.status?.readyReplicas ?? 0
  if (desired === 0) return { status: 'unknown', detail: 'Scaled to zero' }
  if (ready >= desired) return { status: 'healthy' }
  if (ready === 0) return { status: 'error', detail: `0/${desired} ready` }
  return { status: 'degraded', detail: `${ready}/${desired} ready` }
}

export async function buildTopologyGraph(req: TopologyGraphRequest): Promise<TopologyGraphResponse> {
  const clients = clusterManager.require(req.clusterId)
  const ns = req.namespace

  const [podsRes, depsRes, stsRes, rsRes, svcRes, ingRes, cmRes] = await Promise.all([
    ns === 'ALL'
      ? clients.core.listPodForAllNamespaces()
      : clients.core.listNamespacedPod({ namespace: ns }),
    ns === 'ALL'
      ? clients.apps.listDeploymentForAllNamespaces()
      : clients.apps.listNamespacedDeployment({ namespace: ns }),
    ns === 'ALL'
      ? clients.apps.listStatefulSetForAllNamespaces()
      : clients.apps.listNamespacedStatefulSet({ namespace: ns }),
    ns === 'ALL'
      ? clients.apps.listReplicaSetForAllNamespaces()
      : clients.apps.listNamespacedReplicaSet({ namespace: ns }),
    ns === 'ALL'
      ? clients.core.listServiceForAllNamespaces()
      : clients.core.listNamespacedService({ namespace: ns }),
    ns === 'ALL'
      ? clients.networking.listIngressForAllNamespaces()
      : clients.networking.listNamespacedIngress({ namespace: ns }),
    ns === 'ALL'
      ? clients.core.listConfigMapForAllNamespaces()
      : clients.core.listNamespacedConfigMap({ namespace: ns })
  ])

  const pods = (podsRes.items ?? []) as V1Pod[]
  const deployments = (depsRes.items ?? []) as V1Deployment[]
  const statefulSets = (stsRes.items ?? []) as V1StatefulSet[]
  const replicaSets = (rsRes.items ?? []) as V1ReplicaSet[]
  const services = (svcRes.items ?? []) as V1Service[]
  const ingresses = (ingRes.items ?? []) as V1Ingress[]
  const configMaps = (cmRes.items ?? []) as V1ConfigMap[]

  const nodes: TopologyNode[] = []
  const edges: TopologyEdge[] = []
  const nodeIndex = new Map<string, TopologyNode>()

  function addNode(node: TopologyNode): void {
    if (nodeIndex.has(node.id)) return
    nodeIndex.set(node.id, node)
    nodes.push(node)
  }

  function addEdge(edge: TopologyEdge): void {
    if (!nodeIndex.has(edge.source) || !nodeIndex.has(edge.target)) return
    edges.push(edge)
  }

  for (const dep of deployments) {
    const name = dep.metadata?.name ?? ''
    const namespace = dep.metadata?.namespace ?? ''
    const health = deployHealth(dep)
    addNode({
      id: nodeId('Deployment', namespace, name),
      kind: 'Deployment',
      name,
      namespace,
      status: health.status,
      healthDetail: health.detail,
      labels: dep.metadata?.labels ?? undefined,
      replicasReady: dep.status?.readyReplicas ?? 0,
      replicasDesired: dep.spec?.replicas ?? 0,
      ageTimestamp: dep.metadata?.creationTimestamp
        ? new Date(dep.metadata.creationTimestamp).toISOString()
        : null
    })
  }

  for (const sts of statefulSets) {
    const name = sts.metadata?.name ?? ''
    const namespace = sts.metadata?.namespace ?? ''
    const health = stsHealth(sts)
    addNode({
      id: nodeId('StatefulSet', namespace, name),
      kind: 'StatefulSet',
      name,
      namespace,
      status: health.status,
      healthDetail: health.detail,
      labels: sts.metadata?.labels ?? undefined,
      replicasReady: sts.status?.readyReplicas ?? 0,
      replicasDesired: sts.spec?.replicas ?? 0,
      ageTimestamp: sts.metadata?.creationTimestamp
        ? new Date(sts.metadata.creationTimestamp).toISOString()
        : null
    })
  }

  for (const rs of replicaSets) {
    const name = rs.metadata?.name ?? ''
    const namespace = rs.metadata?.namespace ?? ''
    const owner = rs.metadata?.ownerReferences?.find((o) => o.kind === 'Deployment' && o.controller)
    if (owner) {
      addNode({
        id: nodeId('ReplicaSet', namespace, name),
        kind: 'ReplicaSet',
        name,
        namespace,
        status: 'unknown',
        labels: rs.metadata?.labels ?? undefined,
        replicasReady: rs.status?.readyReplicas ?? 0,
        replicasDesired: rs.spec?.replicas ?? 0,
        ageTimestamp: rs.metadata?.creationTimestamp
          ? new Date(rs.metadata.creationTimestamp).toISOString()
          : null
      })
      addEdge({
        id: `owns:${nodeId('Deployment', namespace, owner.name)}->${nodeId('ReplicaSet', namespace, name)}`,
        source: nodeId('Deployment', namespace, owner.name),
        target: nodeId('ReplicaSet', namespace, name),
        relation: 'owns'
      })
    }
  }

  for (const pod of pods) {
    const name = pod.metadata?.name ?? ''
    const namespace = pod.metadata?.namespace ?? ''
    const derived = derivePodStatus(pod)
    const status = colorToHealth(derived.statusColor)
    const id = nodeId('Pod', namespace, name)
    addNode({
      id,
      kind: 'Pod',
      name,
      namespace,
      status,
      healthDetail: derived.statusText === 'Running' ? undefined : derived.statusText,
      labels: pod.metadata?.labels ?? undefined,
      ageTimestamp: pod.metadata?.creationTimestamp
        ? new Date(pod.metadata.creationTimestamp).toISOString()
        : null,
      ports: (pod.spec?.containers ?? [])
        .flatMap((c) => c.ports ?? [])
        .map((p) => `${p.containerPort}/${p.protocol ?? 'TCP'}`)
    })

    const owner = pod.metadata?.ownerReferences?.find((o) => o.controller)
    if (owner?.kind === 'ReplicaSet') {
      addEdge({
        id: `owns:${nodeId('ReplicaSet', namespace, owner.name)}->${id}`,
        source: nodeId('ReplicaSet', namespace, owner.name),
        target: id,
        relation: 'owns'
      })
    } else if (owner?.kind === 'StatefulSet') {
      addEdge({
        id: `owns:${nodeId('StatefulSet', namespace, owner.name)}->${id}`,
        source: nodeId('StatefulSet', namespace, owner.name),
        target: id,
        relation: 'owns'
      })
    }

    for (const cmName of configMapsFromPod(pod)) {
      const cmId = nodeId('ConfigMap', namespace, cmName)
      if (!nodeIndex.has(cmId)) {
        addNode({
          id: cmId,
          kind: 'ConfigMap',
          name: cmName,
          namespace,
          status: 'healthy'
        })
      }
      addEdge({
        id: `mounts:${cmId}->${id}`,
        source: cmId,
        target: id,
        relation: 'mounts'
      })
    }

    for (const dep of parseDependsOn(pod.metadata?.annotations)) {
      const extId = nodeId('External', namespace, dep.name)
      addNode({
        id: extId,
        kind: 'External',
        name: dep.name,
        namespace,
        status: 'unknown',
        externalHost: dep.host,
        protocol: dep.kind
      })
      addEdge({
        id: `dependsOn:${id}->${extId}`,
        source: id,
        target: extId,
        relation: 'dependsOn'
      })
    }
  }

  for (const cm of configMaps) {
    const name = cm.metadata?.name ?? ''
    const namespace = cm.metadata?.namespace ?? ''
    if (name.startsWith('kube-root-ca')) continue
    addNode({
      id: nodeId('ConfigMap', namespace, name),
      kind: 'ConfigMap',
      name,
      namespace,
      status: 'healthy',
      labels: cm.metadata?.labels ?? undefined,
      ageTimestamp: cm.metadata?.creationTimestamp
        ? new Date(cm.metadata.creationTimestamp).toISOString()
        : null
    })
  }

  for (const svc of services) {
    const name = svc.metadata?.name ?? ''
    const namespace = svc.metadata?.namespace ?? ''
    if (name === 'kubernetes' && namespace === 'default') continue
    const ports = (svc.spec?.ports ?? []).map(
      (p) => `${p.port}${p.targetPort ? `→${p.targetPort}` : ''}/${p.protocol ?? 'TCP'}`
    )
    const protocol = (svc.spec?.ports ?? [])
      .map((p) => p.appProtocol || p.name || p.protocol || 'TCP')
      .filter(Boolean)
      .join(', ')
    const id = nodeId('Service', namespace, name)
    addNode({
      id,
      kind: 'Service',
      name,
      namespace,
      status: 'healthy',
      labels: svc.metadata?.labels ?? undefined,
      ports,
      protocol: protocol || undefined,
      ageTimestamp: svc.metadata?.creationTimestamp
        ? new Date(svc.metadata.creationTimestamp).toISOString()
        : null
    })

    const selector = svc.spec?.selector
    let matched = 0
    for (const pod of pods) {
      if (pod.metadata?.namespace !== namespace) continue
      if (!matchesSelector(pod.metadata?.labels, selector)) continue
      matched += 1
      const podId = nodeId('Pod', namespace, pod.metadata?.name ?? '')
      addEdge({
        id: `selects:${id}->${podId}`,
        source: id,
        target: podId,
        relation: 'selects',
        protocol: protocol || undefined,
        ports
      })
    }
    if (selector && Object.keys(selector).length > 0 && matched === 0) {
      const n = nodeIndex.get(id)
      if (n) {
        n.status = 'degraded'
        n.healthDetail = 'No matching pods'
      }
    }

    for (const dep of parseDependsOn(svc.metadata?.annotations)) {
      const extId = nodeId('External', namespace, dep.name)
      addNode({
        id: extId,
        kind: 'External',
        name: dep.name,
        namespace,
        status: 'unknown',
        externalHost: dep.host,
        protocol: dep.kind
      })
      addEdge({
        id: `dependsOn:${id}->${extId}`,
        source: id,
        target: extId,
        relation: 'dependsOn'
      })
    }
  }

  for (const ing of ingresses) {
    const name = ing.metadata?.name ?? ''
    const namespace = ing.metadata?.namespace ?? ''
    const id = nodeId('Ingress', namespace, name)
    addNode({
      id,
      kind: 'Ingress',
      name,
      namespace,
      status: 'healthy',
      labels: ing.metadata?.labels ?? undefined,
      ageTimestamp: ing.metadata?.creationTimestamp
        ? new Date(ing.metadata.creationTimestamp).toISOString()
        : null,
      ports: ['80/HTTP', '443/HTTPS']
    })

    let routed = 0
    for (const rule of ing.spec?.rules ?? []) {
      for (const path of rule.http?.paths ?? []) {
        const svcName = path.backend?.service?.name
        if (!svcName) continue
        routed += 1
        const port = path.backend.service?.port?.number ?? path.backend.service?.port?.name
        addEdge({
          id: `routes:${id}->${nodeId('Service', namespace, svcName)}:${path.path ?? '/'}`,
          source: id,
          target: nodeId('Service', namespace, svcName),
          relation: 'routes',
          protocol: 'HTTP',
          ports: port ? [String(port)] : undefined
        })
      }
    }
    const defaultSvc = ing.spec?.defaultBackend?.service?.name
    if (defaultSvc) {
      routed += 1
      addEdge({
        id: `routes:${id}->${nodeId('Service', namespace, defaultSvc)}:default`,
        source: id,
        target: nodeId('Service', namespace, defaultSvc),
        relation: 'routes',
        protocol: 'HTTP'
      })
    }
    if (routed === 0) {
      const n = nodeIndex.get(id)
      if (n) {
        n.status = 'degraded'
        n.healthDetail = 'No backend services'
      }
    }
  }

  // Optional Prometheus RPS on Service→Pod edges (best-effort, never blocks graph).
  try {
    if (getPrometheusStatus(req.clusterId).available) {
      const res = await prometheusQuery({
        clusterId: req.clusterId,
        query: 'sum by (service) (rate(http_requests_total[5m]))'
      })
      const byService = new Map<string, number>()
      const result = res.data?.result ?? []
      if (Array.isArray(result)) {
        for (const series of result) {
          const svc = series.metric?.service || series.metric?.kubernetes_service
          const value = Array.isArray(series.value) ? Number(series.value[1]) : NaN
          if (svc && Number.isFinite(value)) byService.set(String(svc), value)
        }
      }
      if (byService.size > 0) {
        for (const edge of edges) {
          if (edge.relation !== 'selects') continue
          const svcName = edge.source.split('/')[1]
          if (!svcName) continue
          const rate = byService.get(svcName)
          if (rate !== undefined) edge.rateRps = Math.round(rate * 100) / 100
        }
      }
    }
  } catch {
    // ignore prometheus failures
  }

  // Hide ReplicaSets with no edges to reduce noise
  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(e.source)
    connected.add(e.target)
  }
  const filteredNodes = nodes.filter((n) => n.kind !== 'ReplicaSet' || connected.has(n.id))
  const filteredIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = edges.filter((e) => filteredIds.has(e.source) && filteredIds.has(e.target))

  const applications = buildApplications(filteredNodes)

  return { nodes: filteredNodes, edges: filteredEdges, applications }
}

function buildApplications(nodes: TopologyNode[]): TopologyApplication[] {
  const groups = new Map<
    string,
    { name: string; namespace: string; nodes: TopologyNode[] }
  >()

  for (const node of nodes) {
    if (node.kind === 'External' || node.kind === 'ReplicaSet') continue
    const app = appNameFromLabels(node.labels) ?? `${node.namespace}-ungrouped`
    const key = `${node.namespace}/${app}`
    const g = groups.get(key) ?? { name: app, namespace: node.namespace, nodes: [] }
    g.nodes.push(node)
    groups.set(key, g)
  }

  return [...groups.values()].map((g) => {
    let health: TopologyHealth = 'healthy'
    let errorCount = 0
    let ready = 0
    let desired = 0
    let oldest: string | undefined
    for (const n of g.nodes) {
      health = worstHealth(health, n.status)
      if (n.status === 'error') errorCount += 1
      if (n.replicasReady !== undefined) ready += n.replicasReady
      if (n.replicasDesired !== undefined) desired += n.replicasDesired
      if (n.ageTimestamp && (!oldest || n.ageTimestamp < oldest)) oldest = n.ageTimestamp
    }
    return {
      id: `${g.namespace}/${g.name}`,
      name: g.name,
      namespace: g.namespace,
      health,
      replicaSummary: desired > 0 ? `${ready}/${desired}` : `${g.nodes.length} resources`,
      uptimeHint: oldest,
      errorCount,
      resourceIds: g.nodes.map((n) => n.id)
    }
  })
}
