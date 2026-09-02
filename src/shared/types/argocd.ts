/**
 * Argo CD is read straight from its Kubernetes CRDs (`argoproj.io/v1alpha1`) over the cluster
 * connection the app already has, rather than through the Argo REST API. That keeps the feature
 * working with nothing but the user's kubeconfig — no server URL, no bearer token, no extra
 * login — and it's the same data the Argo UI itself renders.
 *
 * The two write actions mirror what the `argocd` CLI does declaratively, so they need no API
 * server either:
 *   - refresh: set the `argocd.argoproj.io/refresh` annotation
 *   - sync:    set the Application's `.operation` field
 */

export const ARGO_GROUP = 'argoproj.io'
export const ARGO_VERSION = 'v1alpha1'
export const ARGO_API_VERSION = `${ARGO_GROUP}/${ARGO_VERSION}`

export type ArgoSyncStatus = 'Synced' | 'OutOfSync' | 'Unknown'
export type ArgoHealthStatus =
  | 'Healthy'
  | 'Progressing'
  | 'Degraded'
  | 'Suspended'
  | 'Missing'
  | 'Unknown'

export interface ArgoApplication {
  id: string
  name: string
  namespace: string
  /** Argo project this app belongs to (`spec.project`), defaults to `default`. */
  project: string
  syncStatus: ArgoSyncStatus
  healthStatus: ArgoHealthStatus
  /** `status.health.message` — why it's degraded/progressing, when Argo says. */
  healthMessage: string
  /** Where the manifests come from. */
  repoUrl: string
  path: string
  targetRevision: string
  /** Short SHA of the currently synced revision, when known. */
  revision: string
  /** Destination cluster/namespace. */
  destServer: string
  destNamespace: string
  /** True when `spec.syncPolicy.automated` is set. */
  autoSync: boolean
  /** Last sync operation outcome (`status.operationState.phase`). */
  lastOperationPhase: string
  lastOperationMessage: string
  lastSyncedAt: string | null
  ageTimestamp: string | null
}

export interface ArgoApplicationSet {
  id: string
  name: string
  namespace: string
  /** Generator kinds in play (list, cluster, git, matrix, …) — the useful at-a-glance detail. */
  generators: string[]
  /** Applications this set currently owns, resolved by ownerReference. */
  applicationCount: number
  ageTimestamp: string | null
}

export interface ArgoProject {
  id: string
  name: string
  namespace: string
  description: string
  sourceRepos: string[]
  destinations: string[]
  /** Applications assigned to this project. */
  applicationCount: number
  ageTimestamp: string | null
}

/** Counts across every Application, for the dashboard's header strip. */
export interface ArgoSummary {
  applications: number
  synced: number
  outOfSync: number
  healthy: number
  degraded: number
  missing: number
  progressing: number
  applicationSets: number
  projects: number
}

/** One entry in the dashboard's activity feed — sourced from Kubernetes Events on Argo objects. */
export interface ArgoActivityEvent {
  id: string
  kind: string
  name: string
  namespace: string
  /** Event `reason`, e.g. ResourceUpdated / OperationStarted. */
  type: string
  message: string
  timestamp: string | null
}

export interface ArgoInstallation {
  /** False when the Argo CRDs aren't registered — the UI shows a "not installed" state. */
  installed: boolean
  /** Namespace the argocd-server runs in, when it can be found. */
  namespace: string
  /** External URL for "Open Argo UI", resolved from the argocd-server Ingress when present. */
  url: string
  version: string
}

export interface ArgoOverviewResponse {
  installation?: ArgoInstallation
  summary?: ArgoSummary
  /** Applications that are out of sync, degraded or missing — the dashboard's attention list. */
  needsAttention?: ArgoApplication[]
  activity?: ArgoActivityEvent[]
  error?: string
}

export interface ArgoApplicationsResponse {
  applications?: ArgoApplication[]
  error?: string
}

export interface ArgoApplicationSetsResponse {
  applicationSets?: ArgoApplicationSet[]
  error?: string
}

export interface ArgoProjectsResponse {
  projects?: ArgoProject[]
  error?: string
}

export interface ArgoApplicationRequest {
  clusterId: string
  namespace: string
  name: string
}

export interface ArgoActionResponse {
  ok?: true
  error?: string
}

/** `Sync` on many apps at once, as the dashboard's bulk Sync button does. */
export interface ArgoBulkActionRequest {
  clusterId: string
  targets: Array<{ namespace: string; name: string }>
}

export interface ArgoBulkActionResponse {
  succeeded?: number
  failures?: Array<{ name: string; error: string }>
  error?: string
}

/** One entry of `status.resources` — what the Application currently manages. */
export interface ArgoManagedResource {
  id: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
  syncStatus: string
  healthStatus: string
}

/** One entry of `status.history` — a past deployment. */
export interface ArgoHistoryEntry {
  id: string
  revision: string
  deployedAt: string | null
  source: string
}

/** Everything the detail drawer shows for a single Application. */
export interface ArgoApplicationDetail extends ArgoApplication {
  labels: Record<string, string>
  annotations: Record<string, string>
  finalizers: string[]
  /** ApplicationSet (or other owner) that generated this app, from ownerReferences. */
  controlledByKind: string
  controlledByName: string
  /** Container images currently running, from `status.summary.images`. */
  images: string[]
  /** Ingress/route URLs Argo discovered, from `status.summary.externalURLs`. */
  externalUrls: string[]
  reconciledAt: string | null
  /** Every source, so multi-source apps show all repos rather than only the first. */
  sources: Array<{ repoUrl: string; path: string; targetRevision: string; chart: string }>
  syncPolicy: string
  syncOptions: string[]
  managedResources: ArgoManagedResource[]
  history: ArgoHistoryEntry[]
  operationStartedAt: string | null
  operationInitiatedBy: string
  events: ArgoActivityEvent[]
}

export interface ArgoApplicationDetailResponse {
  detail?: ArgoApplicationDetail
  error?: string
}

/**
 * Argo stores its repository and cluster registrations as labelled Secrets in its own
 * namespace, so both lists are read from there rather than from any API.
 */
export const ARGO_SECRET_TYPE_LABEL = 'argocd.argoproj.io/secret-type'

export interface ArgoRepository {
  /** The backing Secret's name — edit/delete act on that object. */
  id: string
  /** Argo's namespace, where the Secret lives. */
  namespace: string
  name: string
  url: string
  /** `git` or `helm`. */
  type: string
  project: string
  ageTimestamp: string | null
}

export interface ArgoClusterEntry {
  /** The backing Secret's name — edit/delete act on that object. */
  id: string
  /** Argo's namespace, where the Secret lives. */
  namespace: string
  name: string
  server: string
  ageTimestamp: string | null
}

export interface ArgoRepositoriesResponse {
  repositories?: ArgoRepository[]
  error?: string
}

export interface ArgoClustersResponse {
  clusters?: ArgoClusterEntry[]
  error?: string
}
