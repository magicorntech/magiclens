import type { V1Secret, V1Service } from '@kubernetes/client-node'
import { mergeClusterSettings } from '@shared/types/clusterSettings'
import type {
  ClusterAppInfo,
  ClusterAppKind,
  ClusterAppOpenResponse,
  ClusterAppsDiscoverResponse
} from '@shared/types/clusterApps'
import { listClusters, updateCluster } from '../persistence/clusterStore'
import type { ClusterClients } from './clusterManager'
import { portForwardManager } from './portForwardManager'
import { resolveServiceBackingPod } from './serviceService'

const FALLBACK_NAMESPACES = [
  'monitoring',
  'observability',
  'grafana',
  'prometheus',
  'argocd',
  'argo-cd',
  'argo',
  'openshift-monitoring',
  'openshift-gitops',
  'cattle-monitoring-system',
  'cattle-dashboards',
  'kube-system',
  'default'
]

type ManualFields = {
  url: string
  username: string
  password: string
}

function displayName(kind: ClusterAppKind): string {
  if (kind === 'argocd') return 'Argo CD'
  if (kind === 'prometheus') return 'Prometheus'
  return 'Grafana'
}

function decodeSecretData(data?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(data ?? {})) {
    try {
      out[key] = Buffer.from(value, 'base64').toString('utf8')
    } catch {
      out[key] = value
    }
  }
  return out
}

function pickCredential(decoded: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = decoded[key]?.trim()
    if (value) return value
  }
  const lower = Object.fromEntries(Object.entries(decoded).map(([k, v]) => [k.toLowerCase(), v]))
  for (const key of keys) {
    const value = lower[key.toLowerCase()]?.trim()
    if (value) return value
  }
  return undefined
}

function serviceLabels(svc: V1Service): Record<string, string> {
  return svc.metadata?.labels ?? {}
}

function serviceName(svc: V1Service): string {
  return (svc.metadata?.name ?? '').toLowerCase()
}

function isSkippedService(svc: V1Service, kind: ClusterAppKind): boolean {
  const name = serviceName(svc)
  if (svc.spec?.clusterIP === 'None') return true
  if (name.includes('image-renderer') || name.includes('headed')) return true
  if (kind === 'grafana') {
    return name.includes('agent') || name.includes('alloy') || (name.includes('operator') && !name.includes('grafana'))
  }
  if (kind === 'prometheus') {
    return (
      name.includes('alertmanager') ||
      name.includes('thanos') ||
      name.includes('node-exporter') ||
      name.includes('kube-state-metrics') ||
      name.includes('adapter') ||
      name.includes('pushgateway') ||
      name.includes('config-reloader') ||
      (name.includes('operator') && !name.includes('operated'))
    )
  }
  return (
    name.includes('repo-server') ||
    name.includes('application-controller') ||
    name.includes('applicationset') ||
    name.includes('notifications') ||
    name.includes('dex-server') ||
    name.includes('redis')
  )
}

function isGrafanaService(svc: V1Service): boolean {
  if (isSkippedService(svc, 'grafana')) return false
  const labels = serviceLabels(svc)
  const name = serviceName(svc)
  if (labels['app.kubernetes.io/name'] === 'grafana') return true
  if (labels.app === 'grafana') return true
  return name === 'grafana' || name.includes('grafana')
}

function isPrometheusService(svc: V1Service): boolean {
  if (isSkippedService(svc, 'prometheus')) return false
  const labels = serviceLabels(svc)
  const name = serviceName(svc)
  if (labels['app.kubernetes.io/name'] === 'prometheus') return true
  if (labels.app === 'prometheus') return true
  if (name === 'prometheus' || name === 'prometheus-operated' || name === 'prometheus-k8s') return true
  return name.includes('prometheus') && !name.includes('grafana')
}

function isArgoCdService(svc: V1Service): boolean {
  if (isSkippedService(svc, 'argocd')) return false
  const labels = serviceLabels(svc)
  const name = serviceName(svc)
  if (labels['app.kubernetes.io/name'] === 'argocd-server') return true
  if (labels['app.kubernetes.io/component'] === 'server' && labels['app.kubernetes.io/part-of'] === 'argocd') {
    return true
  }
  if (labels.app === 'argocd-server') return true
  return name === 'argocd-server' || name.endsWith('-argocd-server') || name.includes('argocd-server')
}

function preferredPort(svc: V1Service, kind: ClusterAppKind): number | undefined {
  const ports = svc.spec?.ports ?? []
  const names =
    kind === 'prometheus'
      ? ['web', 'http', 'prometheus']
      : kind === 'argocd'
        ? ['http', 'https', 'server']
        : ['http', 'service', 'grafana']
  const named = ports.find((p) => p.name && names.includes(p.name.toLowerCase()) && p.port)
  if (named?.port) return named.port
  const numeric =
    kind === 'prometheus'
      ? ports.find((p) => p.port === 9090)
      : kind === 'grafana'
        ? ports.find((p) => p.port === 80 || p.port === 3000)
        : ports.find((p) => p.port === 80 || p.port === 443 || p.port === 8080)
  return numeric?.port ?? ports[0]?.port
}

async function listServices(clients: ClusterClients): Promise<V1Service[]> {
  try {
    const res = await clients.core.listServiceForAllNamespaces()
    return res.items ?? []
  } catch {
    const namespaces = new Set(FALLBACK_NAMESPACES)
    try {
      const ns = await clients.core.listNamespace()
      for (const item of (ns.items ?? []).slice(0, 80)) {
        const name = item.metadata?.name
        if (name) namespaces.add(name)
      }
    } catch {
      // stay on fallbacks
    }
    const collected: V1Service[] = []
    await Promise.all(
      [...namespaces].map(async (namespace) => {
        try {
          const res = await clients.core.listNamespacedService({ namespace })
          collected.push(...(res.items ?? []))
        } catch {
          // namespace missing or forbidden
        }
      })
    )
    return collected
  }
}

function pickService(services: V1Service[], kind: ClusterAppKind): V1Service | undefined {
  const match =
    kind === 'grafana' ? isGrafanaService : kind === 'prometheus' ? isPrometheusService : isArgoCdService
  const hits = services.filter(match)
  hits.sort((a, b) => {
    const aExact = serviceName(a) === kind || serviceName(a) === `${kind}-server` || serviceName(a) === 'argocd-server' ? 0 : 1
    const bExact = serviceName(b) === kind || serviceName(b) === `${kind}-server` || serviceName(b) === 'argocd-server' ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    return serviceName(a).length - serviceName(b).length
  })
  return hits[0]
}

async function readCredentials(
  clients: ClusterClients,
  kind: ClusterAppKind,
  namespace: string
): Promise<{ username?: string; password?: string; secretName?: string }> {
  let secrets: V1Secret[] = []
  try {
    const res = await clients.core.listNamespacedSecret({ namespace })
    secrets = res.items ?? []
  } catch {
    return kind === 'argocd' ? { username: 'admin' } : {}
  }

  const ranked = secrets
    .map((secret) => {
      const name = (secret.metadata?.name ?? '').toLowerCase()
      const labels = secret.metadata?.labels ?? {}
      let score = 0
      if (kind === 'grafana') {
        if (labels['app.kubernetes.io/name'] === 'grafana') score += 5
        if (name.includes('grafana') && name.includes('admin')) score += 6
        if (name.includes('grafana')) score += 3
      } else if (kind === 'argocd') {
        if (name === 'argocd-initial-admin-secret') score += 8
        if (name.includes('argocd') && name.includes('secret')) score += 3
      } else if (kind === 'prometheus') {
        if (name.includes('prometheus') && (name.includes('basic') || name.includes('auth'))) score += 4
      }
      return { secret, score, name }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  const userKeys =
    kind === 'argocd'
      ? ['username', 'admin-user', 'user']
      : ['admin-user', 'admin-username', 'username', 'user', 'GF_SECURITY_ADMIN_USER']
  const passKeys =
    kind === 'argocd'
      ? ['password', 'admin-password']
      : ['admin-password', 'password', 'GF_SECURITY_ADMIN_PASSWORD']

  for (const row of ranked) {
    const decoded = decodeSecretData(row.secret.data)
    const username = pickCredential(decoded, userKeys)
    const password = pickCredential(decoded, passKeys)
    if (username || password) {
      return {
        username: username || (kind === 'argocd' || kind === 'grafana' ? 'admin' : undefined),
        password,
        secretName: row.secret.metadata?.name
      }
    }
  }

  if (kind === 'argocd' || kind === 'grafana') return { username: 'admin' }
  return {}
}

function manualFor(clusterId: string, kind: ClusterAppKind): ManualFields {
  const cluster = listClusters().find((c) => c.id === clusterId)
  const settings = mergeClusterSettings(cluster?.settings)
  const i = settings.integrations
  if (kind === 'grafana') {
    return {
      url: i.grafanaUrl.trim(),
      username: i.grafanaUsername.trim(),
      password: i.grafanaPassword.trim()
    }
  }
  if (kind === 'prometheus') {
    return {
      url: i.prometheusUrl.trim(),
      username: i.prometheusUsername.trim(),
      password: i.prometheusPassword.trim()
    }
  }
  return {
    url: i.argoCdUrl.trim(),
    username: i.argoCdUsername.trim(),
    password: i.argoCdPassword.trim()
  }
}

export function saveManualClusterApp(
  clusterId: string,
  kind: ClusterAppKind,
  fields: ManualFields
): { ok: true } | { ok: false; error: string } {
  const cluster = listClusters().find((c) => c.id === clusterId)
  if (!cluster) return { ok: false, error: 'Cluster not found' }
  const settings = mergeClusterSettings(cluster.settings)
  const integrations = { ...settings.integrations }
  const url = fields.url.trim()
  const username = fields.username.trim()
  const password = fields.password
  if (kind === 'grafana') {
    integrations.grafanaUrl = url
    integrations.grafanaUsername = username
    integrations.grafanaPassword = password
  } else if (kind === 'prometheus') {
    integrations.prometheusUrl = url
    integrations.prometheusUsername = username
    integrations.prometheusPassword = password
  } else {
    integrations.argoCdUrl = url
    integrations.argoCdUsername = username
    integrations.argoCdPassword = password
  }
  updateCluster({
    ...cluster,
    settings: { ...settings, integrations }
  })
  return { ok: true }
}

async function discoverOne(
  clients: ClusterClients,
  clusterId: string,
  kind: ClusterAppKind
): Promise<ClusterAppInfo> {
  const manual = manualFor(clusterId, kind)
  const label = displayName(kind)
  try {
    const services = await listServices(clients)
    const svc = pickService(services, kind)
    const namespace = svc?.metadata?.namespace
    const name = svc?.metadata?.name
    const port = svc ? preferredPort(svc, kind) : undefined
    const creds = namespace ? await readCredentials(clients, kind, namespace) : {}
    const username = manual.username || creds.username
    const password = manual.password || creds.password

    if (manual.url) {
      return {
        kind,
        found: true,
        source: 'manual',
        displayName: label,
        namespace,
        serviceName: name,
        servicePort: port,
        externalUrl: manual.url,
        username,
        password,
        secretName: creds.secretName
      }
    }

    if (!svc || !namespace || !name || !port) {
      return { kind, found: false, source: 'none', displayName: label }
    }

    return {
      kind,
      found: true,
      source: 'auto',
      displayName: label,
      namespace,
      serviceName: name,
      servicePort: port,
      username,
      password,
      secretName: creds.secretName
    }
  } catch (err) {
    if (manual.url) {
      return {
        kind,
        found: true,
        source: 'manual',
        displayName: label,
        externalUrl: manual.url,
        username: manual.username || undefined,
        password: manual.password || undefined
      }
    }
    return {
      kind,
      found: false,
      source: 'none',
      displayName: label,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

function stableAppPort(clusterId: string, kind: ClusterAppKind): number {
  const base = kind === 'grafana' ? 17300 : kind === 'prometheus' ? 17090 : 17080
  let hash = 2166136261
  for (let i = 0; i < clusterId.length; i++) {
    hash ^= clusterId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return base + ((hash >>> 0) % 80)
}

export function openManualIfSet(
  clusterId: string,
  kind: ClusterAppKind
): Extract<ClusterAppOpenResponse, { ok: true }> | null {
  const manual = manualFor(clusterId, kind)
  if (!manual.url) return null
  return {
    ok: true,
    url: manual.url,
    displayName: displayName(kind),
    username: manual.username || undefined,
    password: manual.password || undefined,
    source: 'manual'
  }
}

export async function discoverClusterApps(
  clients: ClusterClients,
  clusterId: string
): Promise<ClusterAppsDiscoverResponse> {
  const apps = await Promise.all(
    (['argocd', 'prometheus', 'grafana'] as ClusterAppKind[]).map((kind) =>
      discoverOne(clients, clusterId, kind)
    )
  )
  return { apps }
}

export async function openClusterApp(
  clients: ClusterClients,
  clusterId: string,
  kind: ClusterAppKind,
  senderId: number
): Promise<ClusterAppOpenResponse> {
  const info = await discoverOne(clients, clusterId, kind)

  if (info.source === 'manual' && info.externalUrl) {
    return {
      ok: true,
      url: info.externalUrl,
      displayName: info.displayName,
      namespace: info.namespace,
      serviceName: info.serviceName,
      username: info.username,
      password: info.password,
      source: 'manual'
    }
  }

  if (!info.found || !info.namespace || !info.serviceName || !info.servicePort) {
    return {
      ok: false,
      missing: true,
      error: `${info.displayName} Service was not found in this cluster. Add a URL only if you want to open it from outside.`
    }
  }

  const existing = portForwardManager.findServiceForward(
    clusterId,
    info.namespace,
    info.serviceName,
    info.servicePort
  )
  if (existing) {
    return {
      ok: true,
      url: `http://127.0.0.1:${existing.localPort}`,
      displayName: info.displayName,
      namespace: info.namespace,
      serviceName: info.serviceName,
      username: info.username,
      password: info.password,
      source: 'auto'
    }
  }

  const { podName, targetPort } = await resolveServiceBackingPod(
    clients,
    info.namespace,
    info.serviceName,
    info.servicePort
  )

  const preferred = stableAppPort(clusterId, kind)
  let started: Awaited<ReturnType<typeof portForwardManager.start>> | undefined
  for (const localPort of [preferred, preferred + 1, preferred + 2, undefined]) {
    started = await portForwardManager.start({
      clusterId,
      clients,
      namespace: info.namespace,
      sourceKind: 'service',
      sourceName: info.serviceName,
      sourcePort: info.servicePort,
      resolvedPodName: podName,
      resolvedTargetPort: targetPort,
      localPort,
      label: info.displayName,
      senderId,
      persistent: true
    })
    if (started.ok) break
  }
  if (!started?.ok) return { ok: false, error: started?.error ?? 'Port-forward failed' }

  return {
    ok: true,
    url: `http://127.0.0.1:${started.session.localPort}`,
    displayName: info.displayName,
    namespace: info.namespace,
    serviceName: info.serviceName,
    username: info.username,
    password: info.password,
    source: 'auto'
  }
}
