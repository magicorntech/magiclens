import { RESOURCE_KINDS, type ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import type { MollyNavigateTarget } from '@shared/types/molly'

const VIRTUAL_PAGES = [
  'applications',
  'workloadsOverview',
  'configOverview',
  'networkOverview',
  'storageOverview',
  'topology',
  'visualizer',
  'eventTimeline',
  'security',
  'portForwarding',
  'dynamicCustomResources',
  'operatorResources',
  'discoveredApiGroups',
  'discoveredApiVersions',
  'helmCharts',
  'helmReleases',
  'argoDashboard',
  'argoApplications',
  'argoApplicationSets',
  'argoProjects',
  'argoRepositories',
  'argoClusters',
  'appArgoCd',
  'appPrometheus',
  'appGrafana'
] as const satisfies readonly VirtualPageKey[]

const VIRTUAL_PAGE_SET = new Set<string>(VIRTUAL_PAGES)
const RESOURCE_KIND_SET = new Set<string>(RESOURCE_KINDS)

/** Common LLM aliases → MagicLens ResourceKind. */
const KIND_ALIASES: Record<string, ResourceKind> = {
  pod: 'Pods',
  pods: 'Pods',
  deployment: 'Deployments',
  deployments: 'Deployments',
  deploy: 'Deployments',
  statefulset: 'StatefulSets',
  statefulsets: 'StatefulSets',
  sts: 'StatefulSets',
  daemonset: 'DaemonSets',
  daemonsets: 'DaemonSets',
  ds: 'DaemonSets',
  replicaset: 'ReplicaSets',
  replicasets: 'ReplicaSets',
  rs: 'ReplicaSets',
  job: 'Jobs',
  jobs: 'Jobs',
  cronjob: 'CronJobs',
  cronjobs: 'CronJobs',
  service: 'Services',
  services: 'Services',
  svc: 'Services',
  configmap: 'ConfigMaps',
  configmaps: 'ConfigMaps',
  cm: 'ConfigMaps',
  secret: 'Secrets',
  secrets: 'Secrets',
  ingress: 'Ingresses',
  ingresses: 'Ingresses',
  ing: 'Ingresses',
  namespace: 'Namespaces',
  namespaces: 'Namespaces',
  ns: 'Namespaces',
  node: 'Nodes',
  nodes: 'Nodes',
  pvc: 'PersistentVolumeClaims',
  persistentvolumeclaim: 'PersistentVolumeClaims',
  persistentvolumeclaims: 'PersistentVolumeClaims',
  pv: 'PersistentVolumes',
  persistentvolume: 'PersistentVolumes',
  persistentvolumes: 'PersistentVolumes',
  storageclass: 'StorageClasses',
  storageclasses: 'StorageClasses',
  sc: 'StorageClasses',
  serviceaccount: 'ServiceAccounts',
  serviceaccounts: 'ServiceAccounts',
  sa: 'ServiceAccounts',
  event: 'Events',
  events: 'Events',
  hpa: 'HorizontalPodAutoscalers',
  horizontalpodautoscaler: 'HorizontalPodAutoscalers',
  horizontalpodautoscalers: 'HorizontalPodAutoscalers',
  crd: 'CustomResourceDefinitions',
  customresourcedefinition: 'CustomResourceDefinitions',
  customresourcedefinitions: 'CustomResourceDefinitions',
  networkpolicy: 'NetworkPolicies',
  networkpolicies: 'NetworkPolicies',
  netpol: 'NetworkPolicies'
}

const VIRTUAL_ALIASES: Record<string, VirtualPageKey> = {
  topology: 'topology',
  map: 'topology',
  graph: 'topology',
  visualizer: 'visualizer',
  viz: 'visualizer',
  events: 'eventTimeline',
  timeline: 'eventTimeline',
  eventtimeline: 'eventTimeline',
  security: 'security',
  helm: 'helmCharts',
  helmcharts: 'helmCharts',
  helmreleases: 'helmCharts',
  releases: 'helmCharts',
  workloads: 'workloadsOverview',
  workloadsoverview: 'workloadsOverview',
  overview: 'workloadsOverview',
  config: 'configOverview',
  configoverview: 'configOverview',
  network: 'networkOverview',
  networkoverview: 'networkOverview',
  storage: 'storageOverview',
  storageoverview: 'storageOverview',
  applications: 'applications',
  apps: 'applications',
  portforward: 'portForwarding',
  portforwarding: 'portForwarding',
  crds: 'dynamicCustomResources',
  customresources: 'dynamicCustomResources',
  operators: 'operatorResources',
  argo: 'argoDashboard',
  argocd: 'argoDashboard',
  argodashboard: 'argoDashboard'
}

function compactKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_\-./]+/g, '')
}

export function normalizeMollyResourceKind(raw: string | undefined | null): ResourceKind | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if (RESOURCE_KIND_SET.has(trimmed)) return trimmed as ResourceKind
  const key = compactKey(trimmed)
  if (KIND_ALIASES[key]) return KIND_ALIASES[key]!
  // Case-insensitive exact ResourceKind match (e.g. "pods" already covered; "PODS")
  const hit = RESOURCE_KINDS.find((k) => compactKey(k) === key)
  return hit ?? null
}

export function normalizeMollyVirtualPage(raw: string | undefined | null): VirtualPageKey | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if (VIRTUAL_PAGE_SET.has(trimmed)) return trimmed as VirtualPageKey
  const key = compactKey(trimmed)
  if (VIRTUAL_ALIASES[key]) return VIRTUAL_ALIASES[key]!
  const hit = VIRTUAL_PAGES.find((p) => compactKey(p) === key)
  return hit ?? null
}

export type MollyAppView = 'molly' | 'clusters' | 'notes' | 'vpn' | 'tabs'

const APP_VIEWS = ['molly', 'clusters', 'notes', 'vpn', 'tabs'] as const satisfies readonly MollyAppView[]

const APP_VIEW_ALIASES: Record<string, MollyAppView> = {
  molly: 'molly',
  mollypage: 'molly',
  mollyhub: 'molly',
  hub: 'molly',
  home: 'molly',
  assistant: 'molly',
  voice: 'molly',
  voiceassistant: 'molly',
  backtomolly: 'molly',
  clusters: 'clusters',
  clusterlist: 'clusters',
  clusterhub: 'clusters',
  notes: 'notes',
  sparks: 'notes',
  vpn: 'vpn',
  tabs: 'tabs',
  clustertab: 'tabs',
  clusterview: 'tabs'
}

export function normalizeMollyAppView(raw: string | undefined | null): MollyAppView | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if ((APP_VIEWS as readonly string[]).includes(trimmed)) return trimmed as MollyAppView
  const key = compactKey(trimmed)
  return APP_VIEW_ALIASES[key] ?? null
}

export interface NormalizedMollyNavigate {
  /** Present for in-cluster navigation. */
  clusterId?: string
  namespace?: string
  kind?: ResourceKind
  name?: string
  virtualPage?: VirtualPageKey
  /** App shell destination (Molly hub, clusters list, …). */
  appView?: MollyAppView
}

/**
 * Coerce LLM navigate args into safe MagicLens targets.
 * Supports app views (e.g. return to Molly) without a clusterId.
 */
export function normalizeMollyNavigate(
  target: MollyNavigateTarget
): { ok: true; value: NormalizedMollyNavigate } | { ok: false; summary: string } {
  let kindRaw = target.kind?.trim() || undefined
  let pageRaw = target.virtualPage?.trim() || undefined
  let appRaw = target.appView?.trim() || undefined

  // "Molly'ye dön" often arrives as virtualPage/kind/appView aliases.
  const appFromAny =
    normalizeMollyAppView(appRaw) ||
    normalizeMollyAppView(pageRaw) ||
    normalizeMollyAppView(kindRaw)

  if (appFromAny) {
    // Pure app navigation — no cluster required.
    if (
      appFromAny === 'molly' ||
      appFromAny === 'clusters' ||
      appFromAny === 'notes' ||
      appFromAny === 'vpn'
    ) {
      return { ok: true, value: { appView: appFromAny } }
    }
    // tabs still needs a cluster if we can resolve one
    appRaw = appFromAny
    pageRaw = undefined
    kindRaw = kindRaw && normalizeMollyAppView(kindRaw) ? undefined : kindRaw
  }

  // Model often puts "Pods" in virtualPage or "topology" in kind — swap if needed.
  if (pageRaw && !normalizeMollyVirtualPage(pageRaw) && normalizeMollyResourceKind(pageRaw)) {
    kindRaw = kindRaw ?? pageRaw
    pageRaw = undefined
  }
  if (kindRaw && !normalizeMollyResourceKind(kindRaw) && normalizeMollyVirtualPage(kindRaw)) {
    pageRaw = pageRaw ?? kindRaw
    kindRaw = undefined
  }
  // Drop app-view strings from kind/page once handled.
  if (kindRaw && normalizeMollyAppView(kindRaw)) kindRaw = undefined
  if (pageRaw && normalizeMollyAppView(pageRaw)) pageRaw = undefined

  const kind = normalizeMollyResourceKind(kindRaw)
  const virtualPage = normalizeMollyVirtualPage(pageRaw)
  const namespace = target.namespace?.trim() || undefined
  const name = target.name?.trim() || undefined
  const clusterId = target.clusterId?.trim() || undefined
  const appView = normalizeMollyAppView(appRaw)

  if (kindRaw && !kind) {
    return {
      ok: false,
      summary: `Unknown resource kind "${kindRaw}". Use MagicLens kinds like Pods, Deployments, Services.`
    }
  }
  if (pageRaw && !virtualPage) {
    return {
      ok: false,
      summary: `Unknown virtualPage "${pageRaw}". Examples: topology, workloadsOverview, helmCharts, eventTimeline — or appView molly to return to Molly.`
    }
  }

  if (!clusterId) {
    if (appView) return { ok: true, value: { appView } }
    return {
      ok: false,
      summary:
        'clusterId required for cluster pages. To open Molly hub use appView/virtualPage "molly" (no clusterId).'
    }
  }

  if (!kind && !virtualPage && !namespace && !name && !appView) {
    return { ok: true, value: { clusterId, appView: 'tabs' } }
  }

  return {
    ok: true,
    value: {
      clusterId,
      namespace,
      kind: kind ?? undefined,
      name,
      virtualPage: virtualPage ?? undefined,
      appView: appView ?? undefined
    }
  }
}
