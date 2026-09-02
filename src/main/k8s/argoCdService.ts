import { PatchStrategy, type KubernetesObject } from '@kubernetes/client-node'
import {
  ARGO_API_VERSION,
  type ArgoActivityEvent,
  ARGO_SECRET_TYPE_LABEL,
  type ArgoApplicationDetail,
  type ArgoClusterEntry,
  type ArgoRepository,
  type ArgoApplication,
  type ArgoApplicationSet,
  type ArgoHealthStatus,
  type ArgoInstallation,
  type ArgoProject,
  type ArgoSummary,
  type ArgoSyncStatus
} from '@shared/types/argocd'
import type { ClusterClients } from './clusterManager'

/**
 * Reads Argo CD state from its CRDs over the existing cluster connection. See the note in
 * `@shared/types/argocd` for why this goes through Kubernetes rather than the Argo REST API.
 */

/** Argo's CRDs are cluster-scoped in registration but the objects live in a namespace. */
const ALL_NAMESPACES = undefined

interface ArgoAppObject extends KubernetesObject {
  spec?: {
    project?: string
    source?: { repoURL?: string; path?: string; targetRevision?: string; chart?: string }
    sources?: Array<{ repoURL?: string; path?: string; targetRevision?: string; chart?: string }>
    destination?: { server?: string; name?: string; namespace?: string }
    syncPolicy?: { automated?: Record<string, unknown> | null; syncOptions?: string[] }
  }
  status?: {
    // Single-source apps report `revision`; multi-source apps report one `revisions` entry per
    // source instead and leave `revision` unset.
    sync?: { status?: string; revision?: string; revisions?: string[] }
    health?: { status?: string; message?: string }
    operationState?: {
      phase?: string
      message?: string
      startedAt?: string
      finishedAt?: string
      operation?: { initiatedBy?: { username?: string; automated?: boolean } }
    }
    reconciledAt?: string
    summary?: { images?: string[]; externalURLs?: string[] }
    resources?: Array<{
      group?: string
      version?: string
      kind?: string
      name?: string
      namespace?: string
      status?: string
      health?: { status?: string }
    }>
    history?: Array<{
      id?: number
      revision?: string
      deployedAt?: string
      source?: { repoURL?: string; path?: string; chart?: string }
    }>
  }
}

interface ArgoAppSetObject extends KubernetesObject {
  spec?: { generators?: Array<Record<string, unknown>> }
}

interface ArgoProjectObject extends KubernetesObject {
  spec?: {
    description?: string
    sourceRepos?: string[]
    destinations?: Array<{ server?: string; name?: string; namespace?: string }>
  }
}

const SYNC_STATUSES: ArgoSyncStatus[] = ['Synced', 'OutOfSync', 'Unknown']
const HEALTH_STATUSES: ArgoHealthStatus[] = [
  'Healthy',
  'Progressing',
  'Degraded',
  'Suspended',
  'Missing',
  'Unknown'
]

function asSyncStatus(value: string | undefined): ArgoSyncStatus {
  return SYNC_STATUSES.includes(value as ArgoSyncStatus) ? (value as ArgoSyncStatus) : 'Unknown'
}

function asHealthStatus(value: string | undefined): ArgoHealthStatus {
  return HEALTH_STATUSES.includes(value as ArgoHealthStatus)
    ? (value as ArgoHealthStatus)
    : 'Unknown'
}

function iso(value: string | Date | undefined | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function objectId(obj: KubernetesObject): string {
  const m = obj.metadata ?? {}
  return m.uid ?? `${m.namespace ?? ''}/${m.name ?? ''}`
}

function toApplication(obj: ArgoAppObject): ArgoApplication {
  const m = obj.metadata ?? {}
  // Multi-source apps put everything in `sources`; single-source in `source`. Show the first.
  const source = obj.spec?.source ?? obj.spec?.sources?.[0] ?? {}
  const dest = obj.spec?.destination ?? {}
  const op = obj.status?.operationState ?? {}

  return {
    id: objectId(obj),
    name: m.name ?? '',
    namespace: m.namespace ?? '',
    project: obj.spec?.project || 'default',
    syncStatus: asSyncStatus(obj.status?.sync?.status),
    healthStatus: asHealthStatus(obj.status?.health?.status),
    healthMessage: obj.status?.health?.message ?? '',
    // A Helm-chart source has no path; show the chart name so the column is never blank.
    repoUrl: source.repoURL ?? '',
    path: source.path ?? source.chart ?? '',
    targetRevision: source.targetRevision ?? '',
    // Multi-source apps pin each source separately; they're almost always the same commit, so
    // showing the first is accurate and keeps the column narrow.
    revision: (obj.status?.sync?.revision || obj.status?.sync?.revisions?.[0] || '').slice(0, 7),
    destServer: dest.server ?? dest.name ?? '',
    destNamespace: dest.namespace ?? '',
    autoSync: obj.spec?.syncPolicy?.automated != null,
    lastOperationPhase: op.phase ?? '',
    lastOperationMessage: op.message ?? '',
    lastSyncedAt: iso(op.finishedAt),
    ageTimestamp: iso(m.creationTimestamp)
  }
}

/** Generator kinds are the object keys of each entry in `spec.generators`. */
function generatorKinds(obj: ArgoAppSetObject): string[] {
  const kinds = new Set<string>()
  for (const generator of obj.spec?.generators ?? []) {
    for (const key of Object.keys(generator ?? {})) kinds.add(key)
  }
  return Array.from(kinds).sort()
}

async function listArgo<T extends KubernetesObject>(
  clients: ClusterClients,
  kind: string
): Promise<T[]> {
  const res = await clients.objects.list(ARGO_API_VERSION, kind, ALL_NAMESPACES)
  return (res.items ?? []) as T[]
}

/**
 * Whether the Argo CRDs are registered. Listing a missing CRD throws a 404, which is a normal
 * answer here ("Argo isn't installed") rather than a failure, so it's translated to a flag the
 * UI can render an empty state from.
 */
export async function getArgoInstallation(clients: ClusterClients): Promise<ArgoInstallation> {
  const result: ArgoInstallation = { installed: false, namespace: '', url: '', version: '' }

  try {
    await clients.objects.list(ARGO_API_VERSION, 'Application', ALL_NAMESPACES, undefined, undefined, undefined, undefined, undefined, 1)
    result.installed = true
  } catch {
    return result
  }

  // The server Deployment tells us the namespace and the image tag doubles as the version.
  try {
    const deployments = await clients.apps.listDeploymentForAllNamespaces({
      labelSelector: 'app.kubernetes.io/name=argocd-server'
    })
    const server = deployments.items?.[0]
    if (server) {
      result.namespace = server.metadata?.namespace ?? ''
      const image = server.spec?.template?.spec?.containers?.[0]?.image ?? ''
      result.version = image.includes(':') ? image.slice(image.lastIndexOf(':') + 1) : ''
    }
  } catch {
    // Version/namespace are decoration — a restricted RBAC role shouldn't hide the whole feature.
  }

  // "Open Argo UI" needs an externally reachable address; the Ingress is the only place that
  // reliably knows one. Without an Ingress the button is simply not offered.
  if (result.namespace) {
    try {
      const ingresses = await clients.networking.listNamespacedIngress({
        namespace: result.namespace
      })
      for (const ing of ingresses.items ?? []) {
        const host = ing.spec?.rules?.[0]?.host
        if (!host) continue
        const tls = (ing.spec?.tls?.length ?? 0) > 0
        result.url = `${tls ? 'https' : 'http'}://${host}`
        break
      }
    } catch {
      // no Ingress access — leave the URL empty
    }
  }

  return result
}

export async function listArgoApplications(clients: ClusterClients): Promise<ArgoApplication[]> {
  const items = await listArgo<ArgoAppObject>(clients, 'Application')
  return items.map(toApplication).sort((a, b) => a.name.localeCompare(b.name))
}

export async function listArgoApplicationSets(
  clients: ClusterClients
): Promise<ArgoApplicationSet[]> {
  const [sets, apps] = await Promise.all([
    listArgo<ArgoAppSetObject>(clients, 'ApplicationSet'),
    listArgo<ArgoAppObject>(clients, 'Application').catch(() => [] as ArgoAppObject[])
  ])

  // An ApplicationSet's generated apps carry it as an ownerReference — the only link back.
  const ownedCount = new Map<string, number>()
  for (const app of apps) {
    for (const owner of app.metadata?.ownerReferences ?? []) {
      if (owner.kind !== 'ApplicationSet') continue
      ownedCount.set(owner.name, (ownedCount.get(owner.name) ?? 0) + 1)
    }
  }

  return sets
    .map((obj) => ({
      id: objectId(obj),
      name: obj.metadata?.name ?? '',
      namespace: obj.metadata?.namespace ?? '',
      generators: generatorKinds(obj),
      applicationCount: ownedCount.get(obj.metadata?.name ?? '') ?? 0,
      ageTimestamp: iso(obj.metadata?.creationTimestamp)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listArgoProjects(clients: ClusterClients): Promise<ArgoProject[]> {
  const [projects, apps] = await Promise.all([
    listArgo<ArgoProjectObject>(clients, 'AppProject'),
    listArgo<ArgoAppObject>(clients, 'Application').catch(() => [] as ArgoAppObject[])
  ])

  const appsPerProject = new Map<string, number>()
  for (const app of apps) {
    const project = app.spec?.project || 'default'
    appsPerProject.set(project, (appsPerProject.get(project) ?? 0) + 1)
  }

  return projects
    .map((obj) => ({
      id: objectId(obj),
      name: obj.metadata?.name ?? '',
      namespace: obj.metadata?.namespace ?? '',
      description: obj.spec?.description ?? '',
      sourceRepos: obj.spec?.sourceRepos ?? [],
      destinations: (obj.spec?.destinations ?? []).map((d) =>
        [d.server ?? d.name ?? '*', d.namespace ?? '*'].join('/')
      ),
      applicationCount: appsPerProject.get(obj.metadata?.name ?? '') ?? 0,
      ageTimestamp: iso(obj.metadata?.creationTimestamp)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function summarize(
  applications: ArgoApplication[],
  applicationSets: number,
  projects: number
): ArgoSummary {
  const summary: ArgoSummary = {
    applications: applications.length,
    synced: 0,
    outOfSync: 0,
    healthy: 0,
    degraded: 0,
    missing: 0,
    progressing: 0,
    applicationSets,
    projects
  }

  for (const app of applications) {
    if (app.syncStatus === 'Synced') summary.synced += 1
    else if (app.syncStatus === 'OutOfSync') summary.outOfSync += 1

    if (app.healthStatus === 'Healthy') summary.healthy += 1
    else if (app.healthStatus === 'Degraded') summary.degraded += 1
    else if (app.healthStatus === 'Missing') summary.missing += 1
    else if (app.healthStatus === 'Progressing') summary.progressing += 1
  }

  return summary
}

/** Anything a user would want to look at: not synced, or not healthy. */
export function needsAttention(applications: ArgoApplication[]): ArgoApplication[] {
  return applications.filter(
    (app) =>
      app.syncStatus === 'OutOfSync' ||
      app.healthStatus === 'Degraded' ||
      app.healthStatus === 'Missing' ||
      app.healthStatus === 'Unknown'
  )
}

/**
 * Recent activity, read from Kubernetes Events emitted against Argo objects. Argo writes an
 * Event for each sync/health transition, so this is the same feed the Argo UI shows — without
 * needing its API.
 */
export async function listArgoActivity(
  clients: ClusterClients,
  namespace: string
): Promise<ArgoActivityEvent[]> {
  if (!namespace) return []

  const res = await clients.core.listNamespacedEvent({ namespace })
  const argoKinds = new Set(['Application', 'ApplicationSet', 'AppProject'])

  return (res.items ?? [])
    .filter((e) => argoKinds.has(e.involvedObject?.kind ?? ''))
    .map((e) => ({
      id: e.metadata?.uid ?? `${e.metadata?.namespace}/${e.metadata?.name}`,
      kind: e.involvedObject?.kind ?? '',
      name: e.involvedObject?.name ?? '',
      namespace: e.involvedObject?.namespace ?? e.metadata?.namespace ?? '',
      type: e.reason ?? '',
      message: e.message ?? '',
      timestamp: iso(e.lastTimestamp ?? e.eventTime ?? e.metadata?.creationTimestamp)
    }))
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    .slice(0, 100)
}

/**
 * Asks Argo to re-compare an Application against its source. This is exactly what
 * `argocd app get --refresh` does: the controller watches this annotation and clears it once
 * the comparison finishes.
 */
export async function refreshArgoApplication(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<void> {
  await patchApplication(clients, namespace, name, {
    metadata: { annotations: { 'argocd.argoproj.io/refresh': 'normal' } }
  })
}

/**
 * Triggers a sync by setting the Application's `operation` field — the declarative equivalent of
 * `argocd app sync`. The controller picks it up, runs the sync, and moves the result into
 * `status.operationState`.
 */
export async function syncArgoApplication(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<void> {
  await patchApplication(clients, namespace, name, {
    operation: {
      // Empty revision means "whatever spec.source.targetRevision resolves to right now",
      // matching the CLI's default and avoiding pinning the app to a stale commit.
      sync: { revision: '', prune: false, syncOptions: null },
      initiatedBy: { username: 'magiclens' },
      info: [{ name: 'Initiated by', value: 'MagicLens' }]
    }
  })
}

async function patchApplication(
  clients: ClusterClients,
  namespace: string,
  name: string,
  body: Record<string, unknown>
): Promise<void> {
  await clients.objects.patch(
    {
      apiVersion: ARGO_API_VERSION,
      kind: 'Application',
      metadata: { name, namespace },
      ...body
    },
    undefined,
    undefined,
    'magiclens',
    undefined,
    // A strategic-merge patch isn't supported on CRDs, so this uses a plain merge patch — the
    // same content type Argo's own CLI sends for these two fields.
    PatchStrategy.MergePatch
  )
}


/** Every source of an app, single- or multi-source, in declaration order. */
function allSources(obj: ArgoAppObject): ArgoApplicationDetail['sources'] {
  const list = obj.spec?.sources ?? (obj.spec?.source ? [obj.spec.source] : [])
  return list.map((src) => ({
    repoUrl: src.repoURL ?? '',
    path: src.path ?? '',
    targetRevision: src.targetRevision ?? '',
    chart: src.chart ?? ''
  }))
}

/**
 * Full detail for one Application, including the resources it manages and its deployment
 * history. Events come from the Application's own namespace filtered to this object, the same
 * way the resource drawers elsewhere in the app source theirs.
 */
export async function getArgoApplicationDetail(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<ArgoApplicationDetail> {
  const obj = (await clients.objects.read({
    apiVersion: ARGO_API_VERSION,
    kind: 'Application',
    metadata: { name, namespace }
  })) as ArgoAppObject

  const m = obj.metadata ?? {}
  const st = obj.status ?? {}
  const ops = st.operationState ?? {}
  const initiatedBy = ops.operation?.initiatedBy ?? {}
  const automated = obj.spec?.syncPolicy?.automated as Record<string, unknown> | null | undefined

  // `syncPolicy.automated` is an object whose own keys are the enabled behaviours (prune,
  // selfHeal), so the label is built from them rather than hardcoded.
  const policyParts: string[] = []
  if (automated) {
    policyParts.push('Automated')
    if (automated['prune']) policyParts.push('prune')
    if (automated['selfHeal']) policyParts.push('self-heal')
  } else {
    policyParts.push('Manual')
  }

  const owner = (m.ownerReferences ?? [])[0]

  let events: ArgoActivityEvent[] = []
  try {
    const res = await clients.core.listNamespacedEvent({
      namespace,
      fieldSelector: `involvedObject.name=${name}`
    })
    events = (res.items ?? [])
      .map((e) => ({
        id: e.metadata?.uid ?? `${e.metadata?.namespace}/${e.metadata?.name}`,
        kind: e.involvedObject?.kind ?? '',
        name: e.involvedObject?.name ?? '',
        namespace: e.involvedObject?.namespace ?? namespace,
        type: e.reason ?? '',
        message: e.message ?? '',
        timestamp: iso(e.lastTimestamp ?? e.eventTime ?? e.metadata?.creationTimestamp)
      }))
      .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
  } catch {
    // Events are supplementary; a restricted role shouldn't fail the whole drawer.
  }

  return {
    ...toApplication(obj),
    labels: m.labels ?? {},
    annotations: m.annotations ?? {},
    finalizers: m.finalizers ?? [],
    controlledByKind: owner?.kind ?? '',
    controlledByName: owner?.name ?? '',
    images: st.summary?.images ?? [],
    externalUrls: st.summary?.externalURLs ?? [],
    reconciledAt: iso(st.reconciledAt),
    sources: allSources(obj),
    syncPolicy: policyParts.join(', '),
    syncOptions: obj.spec?.syncPolicy?.syncOptions ?? [],
    managedResources: (st.resources ?? []).map((r, i) => ({
      id: `${r.kind ?? ''}/${r.namespace ?? ''}/${r.name ?? ''}/${i}`,
      group: r.group ?? '',
      version: r.version ?? '',
      kind: r.kind ?? '',
      name: r.name ?? '',
      namespace: r.namespace ?? '',
      syncStatus: r.status ?? '',
      // Resources with no health concept (ConfigMap, Service) simply omit this.
      healthStatus: r.health?.status ?? ''
    })),
    history: (st.history ?? []).map((h, i) => ({
      id: String(h.id ?? i),
      revision: (h.revision ?? '').slice(0, 7),
      deployedAt: iso(h.deployedAt),
      source: h.source?.path || h.source?.chart || h.source?.repoURL || ''
    })),
    operationStartedAt: iso(ops.startedAt),
    operationInitiatedBy: initiatedBy.username || (initiatedBy.automated ? 'Automated' : ''),
    events
  }
}


/**
 * Decodes one key of a Secret's `data` map.
 *
 * Only ever called for the descriptive fields below. Repository Secrets also hold live
 * credentials (`password`, `username`, `sshPrivateKey`, `tlsClientCertKey`); those are
 * deliberately never read here, so they cannot reach the renderer, the UI, or a log.
 */
function secretValue(secret: { data?: Record<string, string> }, key: string): string {
  const raw = secret.data?.[key]
  if (!raw) return ''
  try {
    return Buffer.from(raw, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

async function listArgoSecrets(
  clients: ClusterClients,
  namespace: string,
  secretType: string
): Promise<Array<{ metadata?: { name?: string; creationTimestamp?: Date }; data?: Record<string, string> }>> {
  if (!namespace) return []
  const res = await clients.core.listNamespacedSecret({
    namespace,
    labelSelector: `${ARGO_SECRET_TYPE_LABEL}=${secretType}`
  })
  return res.items ?? []
}

/** Repositories Argo is configured to pull from. Credentials are intentionally not included. */
export async function listArgoRepositories(
  clients: ClusterClients,
  namespace: string
): Promise<ArgoRepository[]> {
  const items = await listArgoSecrets(clients, namespace, 'repository')
  return items
    .map((s) => ({
      id: s.metadata?.name ?? '',
      namespace,
      // Argo falls back to showing the URL when a repo has no friendly name.
      name: secretValue(s, 'name') || secretValue(s, 'url'),
      url: secretValue(s, 'url'),
      type: secretValue(s, 'type') || 'git',
      project: secretValue(s, 'project'),
      ageTimestamp: iso(s.metadata?.creationTimestamp)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Clusters Argo can deploy to. */
export async function listArgoClusters(
  clients: ClusterClients,
  namespace: string
): Promise<ArgoClusterEntry[]> {
  const items = await listArgoSecrets(clients, namespace, 'cluster')
  return items
    .map((s) => ({
      id: s.metadata?.name ?? '',
      namespace,
      name: secretValue(s, 'name'),
      server: secretValue(s, 'server'),
      ageTimestamp: iso(s.metadata?.creationTimestamp)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
