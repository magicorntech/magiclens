import { isDemoMode } from '../demoUserData'
import { demoMollyTool } from './demoMollyTools'
import type {
  MollyToolCall,
  MollyToolName,
  MollyToolResult,
  MollyStartupCheckId,
  MollyStartupFinding,
  MollyStartupPlan
} from '@shared/types/molly'
import { listClusters } from '../persistence/clusterStore'
import { clusterManager } from '../k8s/clusterManager'
import { withClusterClients } from '../k8s/withClusterClients'
import { getClusterMetricsSummary, getNodeMetricsTable } from '../k8s/metricsService'
import { getNodeMetricsRange, getPodMetricsRange, getPvcUsageTable } from '../k8s/metricsProviderService'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { hasDemoCatalog, isDemoCluster } from '../k8s/demoMode'
import { buildDemoSecurityInventory } from '../k8s/demoSecurityInventory'
import { buildSecurityReport, scanSecurity } from '../k8s/securityService'
import { getSecurityHistory, listSecurityHistory, saveSecurityScan } from '../persistence/securityHistoryStore'
import type { SecurityReport, SecurityScanProgress } from '@shared/types/security'
import type { MetricsSeries } from '@shared/types/metrics'
import { parseCpuQuantity, parseMemoryQuantity } from '../k8s/quantity'
import type { ClusterClients } from '../k8s/clusterManager'
import { apiVersionOf, K8S_KIND_NAME, resourceRegistry } from '../k8s/resourceRegistry'
import { discoverApiResources } from '../k8s/discoveryService'
import { listDynamicResourcesRaw } from '../k8s/dynamicResourceService'
import type { DiscoveredApiResource, DiscoveryResponse } from '@shared/types/discovery'
import type { KubernetesObject } from '@kubernetes/client-node'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'

const LOG_TAIL_LINES = 80
const EVENT_LIMIT = 40
const CPU_WARN_RATIO = 0.85
const MEM_WARN_RATIO = 0.9

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function clusterLabel(clusterId: string): string {
  const c = listClusters().find((x) => x.id === clusterId)
  return c?.customName?.trim() || c?.contextName || clusterId
}

/** Accept UUID or display/context name — models often pass "Ej-Test" instead of id. */
function resolveClusterId(ref: string): string | null {
  const raw = ref.trim()
  if (!raw) return null
  const all = listClusters()
  if (all.some((c) => c.id === raw)) return raw
  const lower = raw.toLowerCase()
  const exact = all.find(
    (c) =>
      c.customName.trim().toLowerCase() === lower || c.contextName.toLowerCase() === lower
  )
  if (exact) return exact.id
  const partial = all.filter(
    (c) =>
      c.customName.trim().toLowerCase().includes(lower) ||
      c.contextName.toLowerCase().includes(lower) ||
      lower.includes(c.customName.trim().toLowerCase()) ||
      lower.includes(c.contextName.toLowerCase())
  )
  if (partial.length === 1) return partial[0]!.id
  return null
}

/**
 * Resolve name→id and ensure clients exist (soft reconnect from persisted kubeconfig).
 * Fixes Live/tools calling getNodeMetrics with "Ej-Test" while manager only knows UUIDs.
 */
function prepareCluster(
  ref: string
): { ok: true; clusterId: string } | { ok: false; summary: string } {
  const clusterId = resolveClusterId(ref)
  if (!clusterId) {
    const hint = listClusters()
      .slice(0, 8)
      .map((c) => `${c.customName.trim() || c.contextName} → ${c.id}`)
      .join('; ')
    return {
      ok: false,
      summary: `Unknown cluster "${ref}". Use listClusters and pass id.${hint ? ` Known: ${hint}` : ''}`
    }
  }
  if (!clusterManager.get(clusterId)) {
    const entry = listClusters().find((c) => c.id === clusterId)
    if (entry?.source && entry.contextName) {
      try {
        clusterManager.connect(clusterId, entry.source, entry.contextName)
      } catch (err) {
        return {
          ok: false,
          summary: `Could not connect to ${clusterLabel(clusterId)}: ${
            err instanceof Error ? err.message : String(err)
          }`
        }
      }
    }
  }
  if (!clusterManager.get(clusterId)) {
    return {
      ok: false,
      summary: `${clusterLabel(clusterId)} is not connected in MagicLens. Open that cluster tab first, then ask again.`
    }
  }
  return { ok: true, clusterId }
}

const KIND_ALIASES: Record<string, ResourceKind> = {
  ingress: 'Ingresses',
  ingresses: 'Ingresses',
  ing: 'Ingresses',
  ingres: 'Ingresses',
  ingreseleri: 'Ingresses',
  ingreseler: 'Ingresses',
  ingressleri: 'Ingresses',
  ingiliz: 'Ingresses',
  ingilizler: 'Ingresses',
  ingiltere: 'Ingresses',
  ingles: 'Ingresses',
  service: 'Services',
  services: 'Services',
  svc: 'Services',
  pod: 'Pods',
  pods: 'Pods',
  deployment: 'Deployments',
  deployments: 'Deployments',
  deploy: 'Deployments',
  namespace: 'Namespaces',
  namespaces: 'Namespaces',
  ns: 'Namespaces',
  node: 'Nodes',
  nodes: 'Nodes',
  configmap: 'ConfigMaps',
  configmaps: 'ConfigMaps',
  cm: 'ConfigMaps',
  secret: 'Secrets',
  secrets: 'Secrets',
  pvc: 'PersistentVolumeClaims',
  persistentvolumeclaim: 'PersistentVolumeClaims',
  persistentvolumeclaims: 'PersistentVolumeClaims',
  job: 'Jobs',
  jobs: 'Jobs',
  cronjob: 'CronJobs',
  cronjobs: 'CronJobs',
  event: 'Events',
  events: 'Events',
  hpa: 'HorizontalPodAutoscalers',
  networkpolicy: 'NetworkPolicies',
  networkpolicies: 'NetworkPolicies',
  network: 'NetworkPolicies',
  netpol: 'NetworkPolicies',
  endpoint: 'Endpoints',
  endpoints: 'Endpoints',
  endpointslice: 'EndpointSlices',
  endpointslices: 'EndpointSlices',
  pv: 'PersistentVolumes',
  persistentvolume: 'PersistentVolumes',
  persistentvolumes: 'PersistentVolumes',
  storageclass: 'StorageClasses',
  storageclasses: 'StorageClasses',
  sc: 'StorageClasses',
  disk: 'PersistentVolumeClaims',
  volume: 'PersistentVolumeClaims',
  volumes: 'PersistentVolumeClaims',
  serviceaccount: 'ServiceAccounts',
  serviceaccounts: 'ServiceAccounts',
  sa: 'ServiceAccounts',
  role: 'Roles',
  roles: 'Roles',
  clusterrole: 'ClusterRoles',
  clusterroles: 'ClusterRoles',
  statefulset: 'StatefulSets',
  statefulsets: 'StatefulSets',
  daemonset: 'DaemonSets',
  daemonsets: 'DaemonSets',
  ingressclass: 'IngressClasses',
  ingressclasses: 'IngressClasses'
}

function kindKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(larini|lerini|larin|lerin|lari|leri|lar|ler)$/, '')
}

function resolveResourceKind(raw: string): ResourceKind | null {
  const key = kindKey(raw)
  if (!key) return null
  if (KIND_ALIASES[key]) return KIND_ALIASES[key]
  if (/ing(iliz|iltere|res|ress)/.test(key)) return 'Ingresses'
  const kinds = Object.keys(resourceRegistry) as ResourceKind[]
  return kinds.find((kind) => kind.toLowerCase() === key) ?? null
}

function pickDiscovered(data: DiscoveryResponse, raw: string): DiscoveredApiResource | null {
  const key = kindKey(raw)
  if (!key) return null
  const hits = data.resources.filter((resource) => {
    if (kindKey(resource.kind) === key || kindKey(resource.name) === key || kindKey(resource.singularName) === key) {
      return true
    }
    return resource.shortNames.some((shortName) => kindKey(shortName) === key)
  })
  if (hits.length === 0) return null
  const preferred = new Set(data.groups.map((group) => `${group.name}|${group.preferredVersion}`))
  return hits.find((resource) => preferred.has(`${resource.group}|${resource.version}`)) ?? hits[0]!
}

function objectStatus(obj: KubernetesObject): string {
  const status = (obj as { status?: { phase?: string; conditions?: Array<{ type?: string; status?: string }> } }).status
  if (status?.phase) return String(status.phase)
  const ready = status?.conditions?.find((condition) => condition.type === 'Ready')
  if (ready) return ready.status === 'True' ? 'Ready' : 'NotReady'
  return '—'
}

function ageLabel(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (sec < 90) return `${sec}s`
  if (sec < 90 * 60) return `${Math.round(sec / 60)}m`
  if (sec < 36 * 3600) return `${Math.round(sec / 3600)}h`
  return `${Math.round(sec / 86400)}d`
}

async function toolListResources(
  clusterId: string,
  kindRaw: string,
  namespaceRaw: string,
  sinceRaw = ''
): Promise<MollyToolResult> {
  const kind = resolveResourceKind(kindRaw)
  if (!kind) return listDiscoveredResources(clusterId, kindRaw, namespaceRaw, sinceRaw)
  if (!clusterId) return { name: 'listResources', ok: false, summary: 'clusterId required' }
  const namespace =
    !namespaceRaw || /^(all|tum|tüm|\*)$/i.test(namespaceRaw) ? 'ALL' : namespaceRaw
  const listed = await withClusterClients(clusterId, (clients) =>
    resourceRegistry[kind].list(clients, namespace)
  )
  if (listed && typeof listed === 'object' && 'error' in listed) {
    return { name: 'listResources', ok: false, summary: String(listed.error) }
  }
  const allItems = listed as ResourceListItem[]
  const since = parseSince(sinceRaw)
  const cutoff = since.sinceTime
    ? Date.parse(since.sinceTime)
    : since.sinceSeconds
      ? Date.now() - since.sinceSeconds * 1000
      : 0
  const items = (cutoff
    ? allItems.filter((item) => {
        const at = item.ageTimestamp ? Date.parse(item.ageTimestamp) : NaN
        return Number.isFinite(at) && at >= cutoff
      })
    : allItems
  ).sort((a, b) => {
    const ta = a.ageTimestamp ? Date.parse(a.ageTimestamp) : 0
    const tb = b.ageTimestamp ? Date.parse(b.ageTimestamp) : 0
    return tb - ta
  })
  const rows = items.slice(0, 40).map((item) => {
    const extra: Record<string, string> = {}
    for (const [col, value] of Object.entries(item.columns)) {
      if (!value || value === '-' || Object.keys(extra).length >= 3) continue
      extra[col] = value
    }
    return {
      name: item.name,
      namespace: item.namespace || '—',
      status: item.statusText,
      age: ageLabel(item.ageTimestamp),
      created: item.ageTimestamp ? new Date(item.ageTimestamp).toISOString().slice(0, 16).replace('T', ' ') : '—',
      ...extra
    }
  })
  const byNs = new Map<string, number>()
  for (const item of items) {
    const ns = item.namespace || 'cluster'
    byNs.set(ns, (byNs.get(ns) ?? 0) + 1)
  }
  const chart = [...byNs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))
  const preview = rows
    .slice(0, 6)
    .map((row) => `${row.namespace}/${row.name}`)
    .join(', ')
  return {
    name: 'listResources',
    ok: true,
    summary: `${items.length} ${kind} on ${clusterLabel(clusterId)}${
      namespace === 'ALL' ? ' (all namespaces)' : ` in ${namespace}`
    }${sinceRaw ? ` since ${sinceRaw}` : ''}${preview ? `: ${preview}` : ''}`,
    data: {
      kind,
      namespace,
      total: items.length,
      rows,
      chart,
      recommendations: recommendFromRows(kind, rows)
    }
  }
}

async function listDiscoveredResources(
  clusterId: string,
  kindRaw: string,
  namespaceRaw: string,
  sinceRaw = ''
): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'listResources', ok: false, summary: 'clusterId required' }
  const namespace = !namespaceRaw || /^(all|tum|tüm|\*)$/i.test(namespaceRaw) ? 'ALL' : namespaceRaw
  let found: Awaited<ReturnType<typeof withClusterClients>>
  try {
    found = await withClusterClients(clusterId, async (clients) => {
    const discovery = await discoverApiResources(clusterId, clients)
    const resource = pickDiscovered(discovery, kindRaw)
    if (!resource) return { error: 'unknown' as const, sample: discovery.resources.slice(0, 12).map((item) => item.kind) }
    const list = await listDynamicResourcesRaw(
      clients,
      resource.apiVersion,
      resource.kind,
      resource.namespaced,
      resource.namespaced ? namespace : 'ALL'
    )
    return { resource, items: list.items ?? [] }
  })
  } catch (err) {
    return {
      name: 'listResources',
      ok: false,
      summary: err instanceof Error ? err.message : String(err)
    }
  }
  if (found && typeof found === 'object' && 'error' in found && found.error === 'unknown') {
    const sample = 'sample' in found && Array.isArray(found.sample) ? found.sample.slice(0, 8).join(', ') : ''
    return {
      name: 'listResources',
      ok: false,
      summary: `Bu kümenin Discovery API’sinde "${kindRaw}" yok.${sample ? ` Örnek türler: ${sample}.` : ''}`
    }
  }
  if (found && typeof found === 'object' && 'error' in found) {
    return { name: 'listResources', ok: false, summary: String(found.error) }
  }
  const resource = (found as { resource: DiscoveredApiResource }).resource
  const objects = (found as { items: KubernetesObject[] }).items
  const since = parseSince(sinceRaw)
  const cutoff = since.sinceTime
    ? Date.parse(since.sinceTime)
    : since.sinceSeconds
      ? Date.now() - since.sinceSeconds * 1000
      : 0
  const filtered = objects.filter((obj) => {
    if (!cutoff) return true
    const at = obj.metadata?.creationTimestamp ? Date.parse(String(obj.metadata.creationTimestamp)) : NaN
    return Number.isFinite(at) && at >= cutoff
  })
  filtered.sort((a, b) => {
    const ta = a.metadata?.creationTimestamp ? Date.parse(String(a.metadata.creationTimestamp)) : 0
    const tb = b.metadata?.creationTimestamp ? Date.parse(String(b.metadata.creationTimestamp)) : 0
    return tb - ta
  })
  const rows = filtered.slice(0, 40).map((obj) => {
    const created = obj.metadata?.creationTimestamp ? String(obj.metadata.creationTimestamp) : null
    return {
      name: obj.metadata?.name ?? '—',
      namespace: obj.metadata?.namespace || '—',
      status: objectStatus(obj),
      age: ageLabel(created),
      created: created ? new Date(created).toISOString().slice(0, 16).replace('T', ' ') : '—'
    }
  })
  const byNs = new Map<string, number>()
  for (const obj of filtered) {
    const ns = obj.metadata?.namespace || 'cluster'
    byNs.set(ns, (byNs.get(ns) ?? 0) + 1)
  }
  const chart = [...byNs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))
  return {
    name: 'listResources',
    ok: true,
    summary: `${filtered.length} ${resource.kind} (${resource.apiVersion}) on ${clusterLabel(clusterId)}${
      !resource.namespaced || namespace === 'ALL' ? '' : ` in ${namespace}`
    }${sinceRaw ? ` since ${sinceRaw}` : ''}`,
    data: {
      kind: resource.kind,
      apiVersion: resource.apiVersion,
      namespace: resource.namespaced ? namespace : 'ALL',
      total: filtered.length,
      rows,
      chart,
      recommendations: recommendFromRows(resource.kind, rows)
    }
  }
}

function recommendFromRows(kind: string, rows: Array<Record<string, string>>): string[] {
  const tips: string[] = []
  const bad = rows.filter((row) => /fail|pending|notready|error|crash|warn|unschedul/i.test(row.status || ''))
  if (bad.length > 0) {
    tips.push(
      `${bad.length} ${kind} sağlıksız görünüyor (${bad
        .slice(0, 3)
        .map((row) => row.name)
        .join(', ')}). Bir şey değiştirmeden önce olaylarına bak.`
    )
  }
  if (kind === 'Ingresses') {
    tips.push('Her Ingress’te class ve adres olmalı. Adres Pending ise controller veya DNS eksik olabilir.')
  } else if (kind === 'Pods') {
    tips.push('CrashLoop veya hazır olmayan pod için son logları ve namespace’teki Warning olaylarını oku.')
  } else if (kind === 'Deployments' || kind === 'StatefulSets' || kind === 'DaemonSets') {
    tips.push('Hazır replika istenenden azsa en yeni podlara ve olaylarına bak. Buradan restart etme.')
  } else if (kind === 'Nodes') {
    tips.push('NotReady düğümde bellek, disk ve ağ koşullarına bak. Drain etme.')
  } else if (kind === 'PersistentVolumeClaims') {
    tips.push('Pending claim genelde uygun StorageClass olmadığı veya volume’un hâlâ bağlandığı anlamına gelir.')
  }
  if (tips.length === 0) {
    tips.push('Bu listede bariz bir hata yok. İstek ve limitleri dolu tut, Warning olaylarını izle.')
  }
  return tips.slice(0, 4)
}

async function inspectDiscoveredResource(
  clusterId: string,
  kindRaw: string,
  namespaceRaw: string,
  nameRaw: string
): Promise<MollyToolResult> {
  if (!nameRaw) {
    const listed = await listDiscoveredResources(clusterId, kindRaw, namespaceRaw)
    return { ...listed, name: 'inspectResource' }
  }
  const namespace = !namespaceRaw || /^(all|tum|tüm|\*)$/i.test(namespaceRaw) ? 'ALL' : namespaceRaw
  let read: Awaited<ReturnType<typeof withClusterClients>>
  try {
    read = await withClusterClients(clusterId, async (clients) => {
    const discovery = await discoverApiResources(clusterId, clients)
    const resource = pickDiscovered(discovery, kindRaw)
    if (!resource) return { error: `Discovery API has no kind "${kindRaw}".` }
    if (resource.namespaced && namespace === 'ALL') {
      return { error: `Namespace is required to inspect ${resource.kind}/${nameRaw}.` }
    }
    const obj = await clients.objects.read({
      apiVersion: resource.apiVersion,
      kind: resource.kind,
      metadata: resource.namespaced ? { name: nameRaw, namespace } : { name: nameRaw }
    })
    return { resource, obj }
  })
  } catch (err) {
    return {
      name: 'inspectResource',
      ok: false,
      summary: err instanceof Error ? err.message : String(err)
    }
  }
  if (read && typeof read === 'object' && 'error' in read) {
    return { name: 'inspectResource', ok: false, summary: String(read.error) }
  }
  const resource = (read as { resource: DiscoveredApiResource }).resource
  const obj = (read as { obj: KubernetesObject & { spec?: unknown; data?: unknown; status?: unknown } }).obj
  const meta = obj.metadata ?? {}
  const secret = /secret/i.test(resource.kind)
  const document = secret
    ? 'Secret values are hidden. Only the name is shown.'
    : JSON.stringify(
        {
          apiVersion: resource.apiVersion,
          kind: resource.kind,
          name: meta.name,
          namespace: meta.namespace,
          labels: meta.labels ?? {},
          spec: obj.spec ?? {},
          status: obj.status ?? {}
        },
        null,
        2
      ).slice(0, 1800)
  const created = meta.creationTimestamp ? String(meta.creationTimestamp) : null
  const rows = [
    {
      name: meta.name ?? nameRaw,
      namespace: meta.namespace || '—',
      status: objectStatus(obj),
      age: ageLabel(created),
      created: created ? new Date(created).toISOString().slice(0, 16).replace('T', ' ') : '—'
    }
  ]
  return {
    name: 'inspectResource',
    ok: true,
    summary: `${resource.kind}/${nameRaw} (${resource.apiVersion}) on ${clusterLabel(clusterId)}.`,
    data: {
      kind: resource.kind,
      apiVersion: resource.apiVersion,
      namespace: meta.namespace || namespace,
      total: 1,
      rows,
      chart: [],
      document,
      logs: '',
      recommendations: recommendFromRows(resource.kind, rows)
    }
  }
}

async function toolInspectResource(
  clusterId: string,
  kindRaw: string,
  namespaceRaw: string,
  nameRaw: string
): Promise<MollyToolResult> {
  const kind = resolveResourceKind(kindRaw)
  if (!kind) return inspectDiscoveredResource(clusterId, kindRaw, namespaceRaw, nameRaw)
  if (!nameRaw) return toolListResources(clusterId, kind, namespaceRaw).then((res) => ({ ...res, name: 'inspectResource' }))
  const gvk = resourceRegistry[kind].gvk
  const namespace =
    !namespaceRaw || /^(all|tum|tüm|\*)$/i.test(namespaceRaw) ? 'ALL' : namespaceRaw
  if (gvk.namespaced && namespace === 'ALL') {
    return {
      name: 'inspectResource',
      ok: false,
      summary: `Namespace is required to inspect ${kind}/${nameRaw}.`
    }
  }
  const listed = await toolListResources(clusterId, kind, gvk.namespaced ? namespace : 'ALL')
  const rows =
    listed.data && typeof listed.data === 'object' && Array.isArray((listed.data as { rows?: unknown }).rows)
      ? ((listed.data as { rows: Array<Record<string, string>> }).rows).filter((row) => row.name === nameRaw)
      : []
  const events = await toolGetEvents(clusterId, gvk.namespaced ? namespace : undefined)
  const relatedEvents =
    events.ok && Array.isArray(events.data)
      ? (events.data as Array<Record<string, unknown>>)
          .filter((event) => String(event.name || '') === nameRaw)
          .slice(0, 6)
      : []
  let logs = ''
  let metrics: Array<{ name: string; value: number }> = []
  if (kind === 'Pods') {
    const logResult = await toolGetPodLogs(clusterId, namespace, nameRaw)
    const logText =
      logResult.data && typeof logResult.data === 'object'
        ? String((logResult.data as { logs?: string }).logs ?? '')
        : ''
    logs = logText.slice(-1500)
    const metricResult = await toolGetPodMetrics(clusterId, namespace, nameRaw)
    if (metricResult.ok && Array.isArray(metricResult.data)) {
      metrics = (metricResult.data as Array<{ name?: string; cpuUsageCores?: number }>).map((row) => ({
        name: row.name || nameRaw,
        value: Number((row.cpuUsageCores ?? 0).toFixed(3))
      }))
    }
  }
  let document = ''
  if (kind === 'Secrets') {
    document = 'Secret values are hidden. Ask for the secret name and keys only.'
  } else {
    const manifest = await withClusterClients(clusterId, async (clients) => {
      const obj = (await clients.objects.read({
        apiVersion: apiVersionOf(gvk),
        kind: K8S_KIND_NAME[kind],
        metadata: gvk.namespaced ? { name: nameRaw, namespace } : { name: nameRaw }
      })) as {
        kind?: string
        metadata?: { name?: string; namespace?: string; labels?: Record<string, string> }
        spec?: unknown
      }
      const meta = obj.metadata ?? {}
      return {
        kind: obj.kind,
        name: meta.name,
        namespace: meta.namespace,
        labels: meta.labels ?? {},
        spec: obj.spec ?? {}
      }
    })
    if (manifest && typeof manifest === 'object' && !('error' in manifest)) {
      document = JSON.stringify(manifest, null, 2).slice(0, 1800)
    }
  }
  const recommendations = [
    ...recommendFromRows(kind, rows.length > 0 ? rows : [{ name: nameRaw, namespace, status: '' }]),
    ...relatedEvents.slice(0, 2).map((event) => `Event ${event.reason}: ${event.message}`)
  ].slice(0, 4)
  return {
    name: 'inspectResource',
    ok: true,
    summary: `${kind}/${nameRaw} on ${clusterLabel(clusterId)}. ${recommendations[0] ?? ''}`,
    data: {
      kind,
      namespace,
      total: 1,
      rows,
      chart: metrics,
      document,
      logs,
      recommendations
    }
  }
}

function lastSample(series?: MetricsSeries[]): number | null {
  const points = series?.[0]?.points
  if (!points || points.length === 0) return null
  const value = points[points.length - 1]?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatBytes(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti']
  let n = value
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  const digits = n >= 10 || i === 0 ? 0 : 1
  return `${n.toFixed(digits)} ${units[i]}`
}

function formatCpu(cores?: number | null): string {
  if (cores == null || !Number.isFinite(cores)) return '—'
  if (Math.abs(cores) < 1) return `${Math.round(cores * 1000)} mCPU`
  const digits = Math.abs(cores) >= 10 ? 0 : 2
  return `${cores.toFixed(digits)} CPU`
}

function formatRate(bytesPerSec: number | null): string {
  if (bytesPerSec == null) return '—'
  return `${formatBytes(bytesPerSec)}/s`
}

async function toolGetUsage(
  clusterId: string,
  namespaceRaw: string,
  podName: string,
  nodeName: string
): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'getUsage', ok: false, summary: 'clusterId required' }
  const namespace = !namespaceRaw || /^(all|tum|tüm|\*)$/i.test(namespaceRaw) ? 'ALL' : namespaceRaw
  const disk = await getPvcUsageTable({ clusterId, namespace })
  const diskRows = [...disk.items]
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
    .slice(0, 12)
    .map((item) => ({
      name: item.name,
      namespace: item.namespace,
      status: item.percent != null ? `${Math.round(item.percent)}%` : '—',
      used: formatBytes(item.usedBytes),
      capacity: formatBytes(item.capacityBytes)
    }))
  const chart = diskRows
    .map((row) => ({ name: row.name, value: Number.parseFloat(row.status) || 0 }))
    .filter((point) => point.value > 0)

  const range = { type: 'preset' as const, preset: '15m' as const }
  const lines: string[] = []
  if (podName && namespace !== 'ALL') {
    const pod = await getPodMetricsRange({ clusterId, namespace, podName, range })
    lines.push(
      `Pod ${namespace}/${podName} ağ alım ${formatRate(lastSample(pod.networkReceive))}, gönderim ${formatRate(lastSample(pod.networkTransmit))}, disk ${formatBytes(lastSample(pod.diskUsage) ?? undefined)}`
    )
  }
  if (nodeName) {
    const node = await getNodeMetricsRange({ clusterId, nodeName, range })
    lines.push(
      `Düğüm ${nodeName} ağ alım ${formatRate(lastSample(node.networkReceive))}, gönderim ${formatRate(lastSample(node.networkTransmit))}, disk doluluk ${
        lastSample(node.filesystemPercent) != null ? `${Math.round(lastSample(node.filesystemPercent)!)}%` : '—'
      }`
    )
  }
  const full = disk.items.filter((item) => (item.percent ?? 0) >= 85)
  const recommendations = [
    full.length > 0
      ? `${full.length} disk %85 üstünde (${full
          .slice(0, 3)
          .map((item) => item.name)
          .join(', ')}). Kapasite veya temizlik gerekir; silme yapma.`
      : disk.metricsAvailable
        ? 'Disk doluluğu şu an kritik değil. PVC listesini ve StorageClass’ı da kontrol et.'
        : 'Disk metriği yok. Kümede Prometheus veya kubelet volume istatistiği açık olmayabilir.',
    'Ağ için Service, Ingress, Endpoint ve NetworkPolicy listesine de bak.'
  ]
  return {
    name: 'getUsage',
    ok: true,
    summary: [
      disk.metricsAvailable ? `${disk.items.length} PVC disk ölçümü` : 'PVC disk ölçümü yok',
      ...lines
    ].join('. '),
    data: {
      kind: 'Disk',
      namespace,
      total: disk.items.length,
      rows: diskRows,
      chart,
      document: lines.join('\n'),
      recommendations
    }
  }
}

const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

function securityPayload(report: SecurityReport): MollyToolResult {
  const ranked = [...report.vulnerabilities].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  )
  const rows = ranked.slice(0, 16).map((item) => ({
    name: item.workload || item.title,
    namespace: item.namespace || '—',
    status: item.severity,
    title: item.title,
    recommendation: item.recommendation
  }))
  const chart = report.severityCounts.map((item) => ({ name: item.level, value: item.count }))
  const recommendations = [
    ...new Set(ranked.map((item) => item.recommendation).filter(Boolean))
  ].slice(0, 6)
  if (recommendations.length === 0) {
    recommendations.push('Bu taramada açık öneri yok. Skor sağlıklıysa periyodik tarama yeterli.')
  }
  return {
    name: 'getSecurity',
    ok: true,
    summary: `Güvenlik skoru ${report.score} · ${report.riskLabel} · ${report.vulnerabilities.length} bulgu`,
    data: {
      kind: 'Security',
      namespace: 'ALL',
      total: report.vulnerabilities.length,
      rows,
      chart,
      recommendations,
      document: `Tarama: ${report.scannedAt}\nSkor: ${report.score}\nRisk: ${report.riskLabel}`
    }
  }
}

function latestSecurityReport(clusterId: string): SecurityReport | null {
  const latest = listSecurityHistory(clusterId)[0]
  if (!latest) return null
  return getSecurityHistory(clusterId, latest.id)?.report ?? null
}

async function toolGetSecurity(clusterId: string): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'getSecurity', ok: false, summary: 'clusterId required' }
  const report = latestSecurityReport(clusterId)
  if (!report) {
    return {
      name: 'getSecurity',
      ok: true,
      summary: `${clusterLabel(clusterId)} için kayıtlı güvenlik taraması yok.`,
      data: {
        kind: 'Security',
        recommendations: ['Yeni bir güvenlik taraması başlat. Sonuç sohbette ve Security sayfasında durur.']
      }
    }
  }
  const payload = securityPayload(report)
  payload.summary = `${clusterLabel(clusterId)} · ${payload.summary}`
  return payload
}

function broadcastSecurityProgress(clusterId: string, partial: Omit<SecurityScanProgress, 'clusterId'>): void {
  const payload: SecurityScanProgress = { clusterId, ...partial }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.SECURITY_SCAN_PROGRESS, payload)
  }
}

async function toolStartSecurityScan(clusterId: string): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'startSecurityScan', ok: false, summary: 'clusterId required' }
  try {
    const report = isDemoCluster(clusterId)
      ? hasDemoCatalog(clusterId)
        ? await buildSecurityReport(clusterId, buildDemoSecurityInventory(), (partial) =>
            broadcastSecurityProgress(clusterId, partial)
          )
        : null
      : await scanSecurity({ clusterId }, (partial) => broadcastSecurityProgress(clusterId, partial))
    if (!report) {
      return { name: 'startSecurityScan', ok: false, summary: 'Bu küme için demo güvenlik verisi yok.' }
    }
    saveSecurityScan(report, 'Molly scan')
    const payload = securityPayload(report)
    payload.name = 'startSecurityScan'
    payload.summary = `Yeni tarama bitti. ${payload.summary}`
    return payload
  } catch (err) {
    return {
      name: 'startSecurityScan',
      ok: false,
      summary: err instanceof Error ? err.message : String(err)
    }
  }
}

async function toolListClusters(): Promise<MollyToolResult> {
  const persisted = listClusters()
  const items = persisted.map((c) => ({
    id: c.id,
    name: c.customName?.trim() || c.contextName,
    connected: Boolean(clusterManager.get(c.id))
  }))
  return {
    name: 'listClusters',
    ok: true,
    summary: `${items.length} cluster(s); ${items.filter((i) => i.connected).length} connected`,
    data: items
  }
}

async function toolGetClusterHealth(clusterId: string): Promise<MollyToolResult> {
  if (!clusterId) {
    return { name: 'getClusterHealth', ok: false, summary: 'clusterId required' }
  }
  const summary = await withClusterClients(clusterId, (clients: ClusterClients) =>
    getClusterMetricsSummary(clients, clusterId)
  )
  if ('error' in summary) {
    return { name: 'getClusterHealth', ok: false, summary: String(summary.error) }
  }
  const cpu = summary.cpuUsageCores
  const cpuCap = summary.cpuCapacityCores
  const mem = summary.memoryUsageBytes
  const memCap = summary.memoryCapacityBytes
  const cpuPct =
    cpu != null && cpuCap > 0 ? Math.round((cpu / cpuCap) * 100) : null
  const memPct =
    mem != null && memCap > 0 ? Math.round((mem / memCap) * 100) : null
  return {
    name: 'getClusterHealth',
    ok: true,
    summary: [
      clusterLabel(clusterId),
      cpuPct != null ? `CPU ${cpuPct}% (${formatCpu(cpu)} / ${formatCpu(cpuCap)})` : 'CPU n/a',
      memPct != null ? `Memory ${memPct}% (${formatBytes(mem)} / ${formatBytes(memCap)})` : 'Memory n/a',
      `nodes ready ${summary.readyNodes}/${summary.totalNodes}`,
      `pods R/P/F ${summary.runningPods}/${summary.pendingPods}/${summary.failedPods}`
    ].join(' · '),
    data: {
      ...summary,
      cpu: formatCpu(cpu),
      memory: formatBytes(mem),
      cpuCapacity: formatCpu(cpuCap),
      memoryCapacity: formatBytes(memCap)
    }
  }
}

async function toolGetNodeMetrics(clusterId: string): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'getNodeMetrics', ok: false, summary: 'clusterId required' }
  const table = await withClusterClients(clusterId, (clients: ClusterClients) =>
    getNodeMetricsTable(clients, clusterId)
  )
  if ('error' in table) {
    return { name: 'getNodeMetrics', ok: false, summary: String(table.error) }
  }
  const top = (table.nodes ?? []).slice(0, 12).map((n) => ({
    name: n.name,
    cpu: formatCpu(n.cpuUsageCores),
    memory: formatBytes(n.memoryUsageBytes),
    cpuCapacity: formatCpu(n.cpuCapacityCores),
    memoryCapacity: formatBytes(n.memoryCapacityBytes),
    cpuUsageCores: n.cpuUsageCores,
    memoryUsageBytes: n.memoryUsageBytes,
    cpuCapacityCores: n.cpuCapacityCores,
    memoryCapacityBytes: n.memoryCapacityBytes
  }))
  const preview = top
    .slice(0, 4)
    .map((n) => `${n.name} ${n.cpu}, ${n.memory}`)
    .join('; ')
  return {
    name: 'getNodeMetrics',
    ok: true,
    summary: `${top.length} node(s) on ${clusterLabel(clusterId)}. ${preview}. Speak mCPU and Mi/Gi, never raw bytes.`,
    data: { metricsAvailable: table.metricsAvailable, nodes: top }
  }
}

async function toolGetPodMetrics(
  clusterId: string,
  namespace: string,
  name?: string
): Promise<MollyToolResult> {
  if (!clusterId || !namespace) {
    return { name: 'getPodMetrics', ok: false, summary: 'clusterId and namespace required' }
  }
  const result = await withClusterClients(clusterId, async (clients: ClusterClients) => {
    try {
      const res = await clients.metrics.getPodMetrics(namespace)
      const items = (res.items ?? [])
        .filter((p) => !name || p.metadata.name === name)
        .slice(0, 30)
        .map((p) => {
          let cpu = 0
          let mem = 0
          for (const c of p.containers ?? []) {
            cpu += parseCpuQuantity(c.usage.cpu)
            mem += parseMemoryQuantity(c.usage.memory)
          }
          return {
            name: p.metadata.name,
            namespace: p.metadata.namespace ?? namespace,
            cpu: formatCpu(cpu),
            memory: formatBytes(mem),
            cpuUsageCores: cpu,
            memoryUsageBytes: mem
          }
        })
      return items
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })
  if ('error' in result) return { name: 'getPodMetrics', ok: false, summary: String(result.error) }
  const preview = result
    .slice(0, 4)
    .map((row) => `${row.name} ${row.cpu}, ${row.memory}`)
    .join('; ')
  return {
    name: 'getPodMetrics',
    ok: true,
    summary: `${result.length} pod(s) in ${namespace}. ${preview}. Speak mCPU and Mi/Gi, never raw bytes.`,
    data: result
  }
}

function asNumber(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function parseSince(raw: string): { sinceSeconds?: number; sinceTime?: string } {
  const s = raw.trim()
  if (!s) return {}
  const rel = s.match(/^(\d+)\s*(s|m|h|d)$/i)
  if (rel) {
    const n = Number(rel[1])
    const unit = rel[2]!.toLowerCase()
    const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400
    return { sinceSeconds: Math.min(n * mult, 7 * 86400) }
  }
  const ms = Date.parse(s)
  if (Number.isFinite(ms)) return { sinceTime: new Date(ms).toISOString() }
  return {}
}

async function toolGetEvents(
  clusterId: string,
  namespace?: string,
  opts?: { since?: string; query?: string }
): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'getEvents', ok: false, summary: 'clusterId required' }
  const result = await withClusterClients(clusterId, async (clients: ClusterClients) => {
    const res = namespace
      ? await clients.core.listNamespacedEvent({ namespace })
      : await clients.core.listEventForAllNamespaces()
    const items = (res.items ?? [])
      .slice()
      .sort((a, b) => {
        const ta =
          Date.parse(
            String(a.lastTimestamp ?? a.eventTime ?? a.metadata?.creationTimestamp ?? '')
          ) || 0
        const tb =
          Date.parse(
            String(b.lastTimestamp ?? b.eventTime ?? b.metadata?.creationTimestamp ?? '')
          ) || 0
        return tb - ta
      })
      .map((e) => ({
        type: e.type,
        reason: e.reason,
        message: e.message,
        namespace: e.metadata?.namespace,
        name: e.involvedObject?.name,
        kind: e.involvedObject?.kind,
        count: e.count,
        at: e.lastTimestamp ?? e.eventTime ?? e.metadata?.creationTimestamp ?? ''
      }))
    return items
  })
  if ('error' in result) return { name: 'getEvents', ok: false, summary: String(result.error) }
  const sinceMs = opts?.since ? Date.parse(parseSince(opts.since).sinceTime ?? '') : NaN
  const sinceSeconds = opts?.since ? parseSince(opts.since).sinceSeconds : undefined
  const cutoff = Number.isFinite(sinceMs)
    ? sinceMs
    : sinceSeconds
      ? Date.now() - sinceSeconds * 1000
      : 0
  const query = opts?.query?.trim().toLowerCase()
  const filtered = result.filter((event) => {
    const at = Date.parse(String(event.at || ''))
    if (cutoff && Number.isFinite(at) && at < cutoff) return false
    if (!query) return true
    return `${event.reason ?? ''} ${event.message ?? ''} ${event.name ?? ''}`.toLowerCase().includes(query)
  })
  const items = filtered.slice(0, EVENT_LIMIT)
  const warnings = items.filter((e) => e.type === 'Warning').length
  return {
    name: 'getEvents',
    ok: true,
    summary: `${items.length} olay${query ? ` (${query})` : ''}${opts?.since ? ` since ${opts.since}` : ''} · ${warnings} warning`,
    data: items
  }
}

async function toolGetPodLogs(
  clusterId: string,
  namespace: string,
  podName: string,
  container?: string,
  opts?: { tailLines?: number; since?: string; query?: string }
): Promise<MollyToolResult> {
  if (!clusterId || !namespace || !podName) {
    return { name: 'getPodLogs', ok: false, summary: 'clusterId, namespace, and podName required' }
  }
  const tailLines = Math.max(1, Math.min(400, Math.round(opts?.tailLines || LOG_TAIL_LINES)))
  const since = parseSince(opts?.since ?? '')
  const result = await withClusterClients(clusterId, async (clients: ClusterClients) => {
    const content = await clients.core.readNamespacedPodLog({
      name: podName,
      namespace,
      container: container || undefined,
      tailLines,
      timestamps: true,
      sinceSeconds: since.sinceSeconds,
      sinceTime: since.sinceTime
    })
    return typeof content === 'string' ? content : String(content)
  })
  if (result && typeof result === 'object' && 'error' in result) {
    return { name: 'getPodLogs', ok: false, summary: String(result.error) }
  }
  const text = typeof result === 'string' ? result : String(result)
  const query = opts?.query?.trim().toLowerCase()
  const matched = query
    ? text
        .split('\n')
        .filter((line) => line.toLowerCase().includes(query))
        .join('\n')
    : text
  const body = matched.trim()
  const clipped = body.length > 12_000 ? `${body.slice(-12_000)}\n…(truncated)` : body
  const shown = clipped ? clipped.split('\n').length : 0
  return {
    name: 'getPodLogs',
    ok: true,
    summary: query && !clipped
      ? `${namespace}/${podName} logunda "${opts?.query}" yok. Podda kalan kayıt bu kadar; daha eskisi silinmiş olabilir.`
      : `${shown} satır · ${namespace}/${podName}${opts?.since ? ` · ${opts.since}` : ''}${query ? ` · ${query}` : ''}`,
    data: {
      logs: clipped,
      kind: 'Logs',
      document: clipped || 'Eşleşen satır yok.',
      total: shown
    }
  }
}

function toolNavigateTo(): MollyToolResult {
  return {
    name: 'navigateTo',
    ok: false,
    summary:
      'UI navigation is disabled. Do not open tabs or pages. Use read-only tools and answer with the facts in chat.'
  }
}

function clipText(text: string, max = 100): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function eventFingerprint(reason: string, message: string, name?: string, namespace?: string): string {
  // Collapse noisy params (IPs, ports, hashes) so duplicates merge.
  const reasonKey = /unhealthy|probe/i.test(reason)
    ? `probe:${namespace || ''}/${name || ''}`
    : reason
  const normalized = message
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '<ip>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\b(liveness|readiness|startup)\s*probe\b/gi, 'probe')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return `${reasonKey}|${normalized.slice(0, 120)}`
}

function eventPriority(reason: string): number {
  const r = reason.toLowerCase()
  if (/crashloop|backoff|failed|oom|evict|unschedul|node.?not.?ready|imagepull/i.test(r)) return 0
  if (/unhealthy|probe|deadline|timeout/i.test(r)) return 1
  if (/finalizer|unexpectedlyremoved/i.test(r)) return 4
  return 2
}

type WarningEvent = {
  type?: string
  reason?: string
  message?: string
  namespace?: string
  name?: string
  kind?: string
  count?: number
}

function summarizeWarningEvents(events: WarningEvent[]): string[] {
  const buckets = new Map<
    string,
    {
      reason: string
      message: string
      count: number
      sampleName?: string
      sampleNs?: string
      probeKinds: Set<string>
    }
  >()

  for (const e of events) {
    if (e.type && e.type !== 'Warning') continue
    const reason = (e.reason || 'Warning').trim()
    const message = (e.message || '').trim()
    const key = eventFingerprint(reason, message, e.name, e.namespace)
    const prev = buckets.get(key)
    const add = Math.max(1, e.count ?? 1)
    const probeKind = message.match(/\b(Liveness|Readiness|Startup)\s+probe\b/i)?.[1]
    if (prev) {
      prev.count += add
      if (probeKind) prev.probeKinds.add(probeKind.toLowerCase())
      continue
    }
    buckets.set(key, {
      reason,
      message,
      count: add,
      sampleName: e.name,
      sampleNs: e.namespace,
      probeKinds: new Set(probeKind ? [probeKind.toLowerCase()] : [])
    })
  }

  const ranked = [...buckets.values()].sort((a, b) => {
    const pa = eventPriority(a.reason)
    const pb = eventPriority(b.reason)
    if (pa !== pb) return pa - pb
    return b.count - a.count
  })

  const out: string[] = []
  let finalizerGroup = 0
  for (const item of ranked) {
    if (/finalizer|unexpectedlyremoved/i.test(item.reason)) {
      finalizerGroup += item.count
      continue
    }
    const where =
      item.sampleNs && item.sampleName ? ` on ${item.sampleNs}/${item.sampleName}` : ''
    const times = item.count > 1 ? ` (×${item.count})` : ''
    if (item.probeKinds.size > 0) {
      const kinds = [...item.probeKinds].join('/')
      out.push(
        `Probe failures (${kinds})${where}${times} — pod may be crash-looping or misconfigured health checks`
      )
    } else {
      out.push(`${item.reason}${where}${times}: ${clipText(item.message, 110)}`)
    }
    if (out.length >= 4) break
  }

  if (finalizerGroup > 0 && out.length < 4) {
    out.push(
      `Load-balancer finalizer warnings (×${finalizerGroup}) — often benign during Service recreate/GKE ILB churn`
    )
  }
  return out
}

async function toolSummarizeAnomalies(clusterId: string): Promise<MollyToolResult> {
  if (!clusterId) return { name: 'summarizeAnomalies', ok: false, summary: 'clusterId required' }
  const [health, events, nodes] = await Promise.all([
    toolGetClusterHealth(clusterId),
    toolGetEvents(clusterId),
    toolGetNodeMetrics(clusterId)
  ])

  const findings: string[] = []
  if (health.ok && health.data && typeof health.data === 'object') {
    const s = health.data as {
      cpuUsageCores?: number
      cpuCapacityCores?: number
      memoryUsageBytes?: number
      memoryCapacityBytes?: number
      readyNodes?: number
      totalNodes?: number
      failedPods?: number
    }
    if (s.cpuUsageCores != null && s.cpuCapacityCores && s.cpuCapacityCores > 0) {
      const r = s.cpuUsageCores / s.cpuCapacityCores
      if (r >= CPU_WARN_RATIO) findings.push(`High cluster CPU (~${Math.round(r * 100)}%)`)
    }
    if (s.memoryUsageBytes != null && s.memoryCapacityBytes && s.memoryCapacityBytes > 0) {
      const r = s.memoryUsageBytes / s.memoryCapacityBytes
      if (r >= MEM_WARN_RATIO) findings.push(`High cluster memory (~${Math.round(r * 100)}%)`)
    }
    if (s.readyNodes != null && s.totalNodes != null && s.readyNodes < s.totalNodes) {
      findings.push(`Nodes not ready: ${s.readyNodes}/${s.totalNodes}`)
    }
    if (s.failedPods != null && s.failedPods > 0) {
      findings.push(`Failed pods: ${s.failedPods}`)
    }
  }

  if (events.ok && Array.isArray(events.data)) {
    findings.push(...summarizeWarningEvents(events.data as WarningEvent[]))
  }

  if (nodes.ok && nodes.data && typeof nodes.data === 'object') {
    const list =
      (nodes.data as { nodes?: Array<{ name?: string; cpuUsageCores?: number; cpuCapacityCores?: number }> })
        .nodes ?? []
    for (const n of list) {
      if (
        n.cpuUsageCores != null &&
        n.cpuCapacityCores &&
        n.cpuCapacityCores > 0 &&
        n.cpuUsageCores / n.cpuCapacityCores >= CPU_WARN_RATIO
      ) {
        findings.push(`High CPU on node ${n.name}`)
      }
    }
  }

  // Failed / crashlooping pods (best effort)
  const podsResult = await withClusterClients(clusterId, async (clients: ClusterClients) => {
    const res = await clients.core.listPodForAllNamespaces()
    return (res.items ?? [])
      .filter((p) => {
        const phase = p.status?.phase
        if (phase === 'Failed') return true
        const waiting = p.status?.containerStatuses?.some(
          (c) =>
            c.state?.waiting?.reason === 'CrashLoopBackOff' ||
            c.state?.waiting?.reason === 'ImagePullBackOff' ||
            c.state?.waiting?.reason === 'ErrImagePull'
        )
        return Boolean(waiting)
      })
      .slice(0, 15)
      .map((p) => ({
        name: p.metadata?.name,
        namespace: p.metadata?.namespace,
        phase: p.status?.phase,
        reason: p.status?.containerStatuses?.find((c) => c.state?.waiting)?.state?.waiting?.reason
      }))
  })
  if (!('error' in podsResult)) {
    for (const p of podsResult) {
      findings.push(`Pod issue ${p.namespace}/${p.name}: ${p.reason ?? p.phase}`)
    }
  }

  // Cap + dedupe final finding lines
  const unique: string[] = []
  const seen = new Set<string>()
  for (const f of findings) {
    const key = f.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(f)
    if (unique.length >= 8) break
  }

  return {
    name: 'summarizeAnomalies',
    ok: true,
    summary:
      unique.length === 0
        ? `No major anomalies on ${clusterLabel(clusterId)}`
        : `${unique.length} finding(s)`,
    data: { findings: unique, health: health.summary, events: events.summary }
  }
}

const MUTATING_TOOL_RE =
  /^(delete|create|apply|patch|update|replace|scale|restart|exec|rollout|uninstall|install|drain|cordon|taint)/i

export async function runMollyTool(call: MollyToolCall): Promise<MollyToolResult> {
  const args = { ...(call.args ?? {}) }
  const toolName = String(call.name || '')
  if (toolName === 'navigateTo') {
    return toolNavigateTo()
  }
  // Hard deny: Molly has no write/delete surface — block hallucinated mutating tools.
  if (
    MUTATING_TOOL_RE.test(toolName) ||
    !MOLLY_TOOL_NAMES.includes(toolName as MollyToolName)
  ) {
    return {
      name: 'listClusters',
      ok: false,
      summary:
        'Molly is read-only. Ask for a resource list, status, metrics, events, or logs — the answer stays in chat.'
    }
  }
  if (isDemoMode()) return demoMollyTool(call)
  if (call.name !== 'listClusters' && args.clusterId != null) {
    // Normalize cluster references for every tool that needs live clients.
    const prepared = prepareCluster(asString(args.clusterId))
    if (!prepared.ok) {
      return { name: call.name, ok: false, summary: prepared.summary }
    }
    args.clusterId = prepared.clusterId
  }

  const clusterId = asString(args.clusterId)
  switch (call.name) {
    case 'listClusters':
      return toolListClusters()
    case 'getClusterHealth':
      return toolGetClusterHealth(clusterId)
    case 'getNodeMetrics':
      return toolGetNodeMetrics(clusterId)
    case 'getPodMetrics':
      return toolGetPodMetrics(clusterId, asString(args.namespace), asString(args.name) || undefined)
    case 'getEvents':
      return toolGetEvents(clusterId, asString(args.namespace) || undefined, {
        since: asString(args.since) || asString(args.sinceTime),
        query: asString(args.query) || asString(args.filter)
      })
    case 'getPodLogs':
      return toolGetPodLogs(
        clusterId,
        asString(args.namespace),
        asString(args.podName) || asString(args.name),
        asString(args.container) || undefined,
        {
          tailLines: asNumber(args.tailLines) ?? asNumber(args.lines),
          since: asString(args.since) || asString(args.sinceTime),
          query: asString(args.query) || asString(args.filter)
        }
      )
    case 'summarizeAnomalies':
      return toolSummarizeAnomalies(clusterId)
    case 'listResources':
      return toolListResources(
        clusterId,
        asString(args.kind),
        asString(args.namespace),
        asString(args.since) || asString(args.sinceTime)
      )
    case 'getSecurity':
      return toolGetSecurity(clusterId)
    case 'startSecurityScan':
      return toolStartSecurityScan(clusterId)
    case 'getUsage':
      return toolGetUsage(
        clusterId,
        asString(args.namespace),
        asString(args.podName) || asString(args.pod),
        asString(args.nodeName) || asString(args.node)
      )
    case 'inspectResource':
      return toolInspectResource(
        clusterId,
        asString(args.kind),
        asString(args.namespace),
        asString(args.name)
      )
    default:
      return { name: call.name, ok: false, summary: `Unknown tool: ${call.name}` }
  }
}

export async function runStartupChecks(
  plan: MollyStartupPlan,
  connectedClusterIds: string[]
): Promise<MollyStartupFinding[]> {
  if (!plan.enabled) return []
  const targets =
    plan.clusterIds.length > 0
      ? plan.clusterIds.filter((id) => connectedClusterIds.includes(id))
      : connectedClusterIds

  const findings: MollyStartupFinding[] = []
  for (const clusterId of targets) {
    const checks = new Set<MollyStartupCheckId>(plan.checks)
    if (checks.has('cpu') || checks.has('memory') || checks.has('failedPods') || checks.has('events')) {
      const anomalies = await toolSummarizeAnomalies(clusterId)
      const list =
        anomalies.data && typeof anomalies.data === 'object'
          ? ((anomalies.data as { findings?: string[] }).findings ?? [])
          : []
      for (const message of list) {
        const severity: MollyStartupFinding['severity'] = /CrashLoop|Failed pods|not ready|High cluster|Unhealthy|ImagePull|OOM/i.test(
          message
        )
          ? 'warning'
          : /finalizer/i.test(message)
            ? 'info'
            : 'info'
        findings.push({
          clusterId,
          clusterName: clusterLabel(clusterId),
          severity,
          message
        })
      }
    }
  }

  // Prefer actionable warnings first for UI / speech.
  findings.sort((a, b) => {
    const rank = (s: MollyStartupFinding['severity']): number =>
      s === 'critical' ? 0 : s === 'warning' ? 1 : 2
    return rank(a.severity) - rank(b.severity)
  })
  return findings
}

export const MOLLY_TOOL_NAMES: MollyToolName[] = [
  'listClusters',
  'getClusterHealth',
  'getNodeMetrics',
  'getPodMetrics',
  'getEvents',
  'getPodLogs',
  'listResources',
  'inspectResource',
  'getUsage',
  'getSecurity',
  'startSecurityScan',
  'summarizeAnomalies'
]
