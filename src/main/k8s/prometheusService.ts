import fetch from 'node-fetch'
import type { V1Service } from '@kubernetes/client-node'
import type {
  PrometheusDiscoverRequest,
  PrometheusQueryData,
  PrometheusQueryRangeRequest,
  PrometheusQueryRequest,
  PrometheusQueryResponse,
  PrometheusStatus
} from '@shared/types/prometheus'
import type { ClusterClients } from './clusterManager'
import { clusterManager } from './clusterManager'
import { listClusters } from '../persistence/clusterStore'

interface ResolvedPrometheus {
  queryBaseUrl: string
  discoveryMethod: 'auto' | 'manual'
  namespace?: string
  serviceName?: string
  servicePort?: number
}

const statusCache = new Map<string, PrometheusStatus>()
const resolvedCache = new Map<string, ResolvedPrometheus>()

const PREFERRED_NAMESPACES = ['monitoring', 'prometheus', 'observability', 'kube-system']

function nowIso(): string {
  return new Date().toISOString()
}

function manualUrlForCluster(clusterId: string): string | undefined {
  const trimmed = listClusters().find((c) => c.id === clusterId)?.prometheusUrl?.trim()
  return trimmed || undefined
}

function buildProxyBase(server: string, namespace: string, serviceName: string, port: number | string): string {
  return `${server.replace(/\/$/, '')}/api/v1/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(serviceName)}:${port}/proxy`
}

function resolveManualBase(server: string, manualUrl: string): string {
  const trimmed = manualUrl.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/$/, '')
  if (trimmed.startsWith('/')) return `${server.replace(/\/$/, '')}${trimmed}`.replace(/\/$/, '')
  return trimmed.replace(/\/$/, '')
}

function resolveServicePort(svc: V1Service): number | string | null {
  const ports = svc.spec?.ports ?? []
  const named = ports.find((p) => p.name === 'http' || p.name === 'web' || p.name === 'prometheus')
  if (named?.port) return named.port
  const promPort = ports.find((p) => p.port === 9090)
  if (promPort?.port) return promPort.port
  return ports[0]?.port ?? null
}

function isPrometheusCandidate(svc: V1Service): boolean {
  const name = (svc.metadata?.name ?? '').toLowerCase()
  if (name.includes('alertmanager') || name.includes('operator') || name.includes('thanos')) return false
  const labels = svc.metadata?.labels ?? {}
  if (labels['app.kubernetes.io/name'] === 'prometheus') return true
  if (labels.app === 'prometheus') return true
  return name.includes('prometheus')
}

async function prometheusFetch(
  clients: ClusterClients,
  queryBaseUrl: string,
  apiPath: string,
  params?: Record<string, string>
): Promise<Awaited<ReturnType<typeof fetch>>> {
  const base = queryBaseUrl.replace(/\/$/, '')
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  const url = new URL(`${base}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  }
  const opts = await clients.kc.applyToFetchOptions({})
  opts.method = 'GET'
  return fetch(url.toString(), opts)
}

async function healthCheck(clients: ClusterClients, queryBaseUrl: string): Promise<boolean> {
  try {
    const res = await prometheusFetch(clients, queryBaseUrl, '/api/v1/query', { query: 'up' })
    if (res.status !== 200) return false
    const json = (await res.json()) as { status?: string }
    return json.status === 'success'
  } catch {
    return false
  }
}

async function tryManualUrl(
  clients: ClusterClients,
  server: string,
  manualUrl: string
): Promise<ResolvedPrometheus | null> {
  const queryBaseUrl = resolveManualBase(server, manualUrl)
  if (!(await healthCheck(clients, queryBaseUrl))) return null
  return { queryBaseUrl, discoveryMethod: 'manual' }
}

async function tryPrometheusOperator(clients: ClusterClients, server: string): Promise<ResolvedPrometheus | null> {
  try {
    const res = await clients.customObjects.listClusterCustomObject({
      group: 'monitoring.coreos.com',
      version: 'v1',
      plural: 'prometheuses'
    })
    const items = ((res as { items?: { metadata?: { name?: string; namespace?: string } }[] }).items ?? [])
    for (const prom of items) {
      const namespace = prom.metadata?.namespace
      const name = prom.metadata?.name
      if (!namespace || !name) continue
      for (const serviceName of [name, `${name}-prometheus`, 'prometheus-operated', 'prometheus-k8s']) {
        for (const port of [9090, 'http']) {
          const queryBaseUrl = buildProxyBase(server, namespace, serviceName, port)
          if (await healthCheck(clients, queryBaseUrl)) {
            return {
              queryBaseUrl,
              discoveryMethod: 'auto',
              namespace,
              serviceName,
              servicePort: typeof port === 'number' ? port : undefined
            }
          }
        }
      }
    }
  } catch {
    // Prometheus Operator CRD not installed
  }
  return null
}

async function tryServiceDiscovery(clients: ClusterClients, server: string): Promise<ResolvedPrometheus | null> {
  const candidates: V1Service[] = []

  for (const namespace of PREFERRED_NAMESPACES) {
    try {
      const res = await clients.core.listNamespacedService({ namespace })
      candidates.push(...res.items.filter(isPrometheusCandidate))
    } catch {
      // namespace may not exist
    }
  }

  if (candidates.length === 0) {
    const all = await clients.core.listServiceForAllNamespaces()
    candidates.push(...all.items.filter(isPrometheusCandidate))
  }

  for (const svc of candidates) {
    const namespace = svc.metadata?.namespace
    const serviceName = svc.metadata?.name
    const port = resolveServicePort(svc)
    if (!namespace || !serviceName || port == null) continue
    const queryBaseUrl = buildProxyBase(server, namespace, serviceName, port)
    if (await healthCheck(clients, queryBaseUrl)) {
      return {
        queryBaseUrl,
        discoveryMethod: 'auto',
        namespace,
        serviceName,
        servicePort: typeof port === 'number' ? port : undefined
      }
    }
  }

  return null
}

function toStatus(resolved: ResolvedPrometheus | null, error?: string): PrometheusStatus {
  if (resolved) {
    return {
      available: true,
      discoveryMethod: resolved.discoveryMethod,
      baseUrl: resolved.queryBaseUrl,
      namespace: resolved.namespace,
      serviceName: resolved.serviceName,
      servicePort: resolved.servicePort,
      lastCheckedAt: nowIso()
    }
  }
  return {
    available: false,
    discoveryMethod: 'none',
    error: error ?? 'Prometheus was not found in this cluster',
    lastCheckedAt: nowIso()
  }
}

export async function discoverPrometheus(req: PrometheusDiscoverRequest): Promise<PrometheusStatus> {
  const clients = clusterManager.require(req.clusterId)
  const server = clients.kc.getCurrentCluster()?.server ?? ''
  const manualUrl = req.manualUrl?.trim() || manualUrlForCluster(req.clusterId)

  let resolved: ResolvedPrometheus | null = null

  if (manualUrl) {
    resolved = await tryManualUrl(clients, server, manualUrl)
  }
  if (!resolved) {
    resolved = await tryPrometheusOperator(clients, server)
  }
  if (!resolved) {
    resolved = await tryServiceDiscovery(clients, server)
  }

  const status = toStatus(resolved)
  statusCache.set(req.clusterId, status)
  if (resolved) resolvedCache.set(req.clusterId, resolved)
  else resolvedCache.delete(req.clusterId)
  return status
}

export function getPrometheusStatus(clusterId: string): PrometheusStatus {
  return (
    statusCache.get(clusterId) ?? {
      available: false,
      discoveryMethod: 'none',
      error: 'Prometheus has not been discovered yet',
      lastCheckedAt: nowIso()
    }
  )
}

export function clearPrometheusCache(clusterId: string): void {
  statusCache.delete(clusterId)
  resolvedCache.delete(clusterId)
}

function getResolved(clusterId: string): ResolvedPrometheus | undefined {
  return resolvedCache.get(clusterId)
}

function parseQueryBody(json: unknown): PrometheusQueryData | undefined {
  if (!json || typeof json !== 'object') return undefined
  const body = json as { status?: string; data?: PrometheusQueryData }
  if (body.status !== 'success' || !body.data) return undefined
  return body.data
}

export async function prometheusQuery(req: PrometheusQueryRequest): Promise<PrometheusQueryResponse> {
  const resolved = getResolved(req.clusterId)
  if (!resolved) {
    return { available: false, error: 'Prometheus is not available for this cluster' }
  }

  try {
    const clients = clusterManager.require(req.clusterId)
    const params: Record<string, string> = { query: req.query }
    if (req.time !== undefined) params.time = String(req.time)
    const res = await prometheusFetch(clients, resolved.queryBaseUrl, '/api/v1/query', params)
    const json = await res.json()
    if (res.status !== 200) {
      const message = (json as { error?: string }).error ?? `HTTP ${res.status}`
      return { available: true, error: message }
    }
    const data = parseQueryBody(json)
    if (!data) return { available: true, error: 'Unexpected Prometheus response' }
    return { available: true, data }
  } catch (err) {
    return { available: true, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function prometheusQueryRange(req: PrometheusQueryRangeRequest): Promise<PrometheusQueryResponse> {
  const resolved = getResolved(req.clusterId)
  if (!resolved) {
    return { available: false, error: 'Prometheus is not available for this cluster' }
  }

  try {
    const clients = clusterManager.require(req.clusterId)
    const res = await prometheusFetch(clients, resolved.queryBaseUrl, '/api/v1/query_range', {
      query: req.query,
      start: String(req.start),
      end: String(req.end),
      step: req.step
    })
    const json = await res.json()
    if (res.status !== 200) {
      const message = (json as { error?: string }).error ?? `HTTP ${res.status}`
      return { available: true, error: message }
    }
    const data = parseQueryBody(json)
    if (!data) return { available: true, error: 'Unexpected Prometheus response' }
    return { available: true, data }
  } catch (err) {
    return { available: true, error: err instanceof Error ? err.message : String(err) }
  }
}
