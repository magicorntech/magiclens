import * as zlib from 'node:zlib'
import { parseAllDocuments } from 'yaml'
import { PatchStrategy } from '@kubernetes/client-node'
import type { KubernetesObject, V1Secret } from '@kubernetes/client-node'
import type { HelmChartSummary, HelmRelease, HelmReleaseHistoryEntry } from '@shared/types/helm'
import type { ClusterClients } from './clusterManager'

interface DecodedHelmRelease {
  name: string
  namespace: string
  version: number
  info?: { status?: string; last_deployed?: string; description?: string }
  chart?: { metadata?: { name?: string; version?: string; appVersion?: string } }
  manifest?: string
  config?: unknown
}

/** Helm v3 stores each release revision as a Secret (owner=helm) whose `data.release` value is
 * base64(gzip(json)) — no `helm` CLI or extra dependency needed, we just reverse that encoding. */
function decodeReleaseSecret(base64Value: string): DecodedHelmRelease | null {
  try {
    const helmEncoded = Buffer.from(base64Value, 'base64').toString('utf8')
    const gzipped = Buffer.from(helmEncoded, 'base64')
    const json = zlib.gunzipSync(gzipped).toString('utf8')
    return JSON.parse(json) as DecodedHelmRelease
  } catch {
    return null
  }
}

/** Inverse of decodeReleaseSecret — reproduces Helm's own storage encoding exactly. */
function encodeReleaseSecret(release: DecodedHelmRelease): string {
  const json = JSON.stringify(release)
  const gzipped = zlib.gzipSync(Buffer.from(json, 'utf8'))
  const helmEncoded = gzipped.toString('base64')
  return Buffer.from(helmEncoded, 'utf8').toString('base64')
}

function releaseSecretName(name: string, revision: number): string {
  return `sh.helm.release.v1.${name}.v${revision}`
}

function toReleaseSummary(secret: V1Secret, decoded: DecodedHelmRelease): HelmRelease {
  return {
    id: secret.metadata?.uid ?? `${decoded.namespace}/${decoded.name}/${decoded.version}`,
    name: decoded.name,
    namespace: decoded.namespace,
    revision: decoded.version,
    status: decoded.info?.status ?? 'unknown',
    chartName: decoded.chart?.metadata?.name ?? '-',
    chartVersion: decoded.chart?.metadata?.version ?? '-',
    appVersion: decoded.chart?.metadata?.appVersion ?? '',
    updated: decoded.info?.last_deployed ?? null
  }
}

async function listReleaseSecrets(
  clients: ClusterClients,
  labelSelector: string
): Promise<{ secret: V1Secret; decoded: DecodedHelmRelease }[]> {
  const res = await clients.core.listSecretForAllNamespaces({ labelSelector })
  const decodedList: { secret: V1Secret; decoded: DecodedHelmRelease }[] = []
  for (const secret of res.items) {
    const raw = secret.data?.release
    if (!raw) continue
    const decoded = decodeReleaseSecret(raw)
    if (decoded) decodedList.push({ secret, decoded })
  }
  return decodedList
}

/** Returns the latest revision of every Helm release found in the cluster, read directly from
 * Helm's own storage secrets so it works regardless of whether the `helm` CLI is installed. */
export async function listHelmReleases(clients: ClusterClients): Promise<HelmRelease[]> {
  const all = await listReleaseSecrets(clients, 'owner=helm')
  const latestByRelease = new Map<string, HelmRelease>()

  for (const { secret, decoded } of all) {
    const item = toReleaseSummary(secret, decoded)
    const key = `${item.namespace}/${item.name}`
    const existing = latestByRelease.get(key)
    if (!existing || item.revision > existing.revision) {
      latestByRelease.set(key, item)
    }
  }

  return Array.from(latestByRelease.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** Derives an "installed charts" view (distinct chart name+version currently deployed) from live
 * release data. This reflects what's actually running, not a full chart-repository browser. */
export async function listHelmCharts(clients: ClusterClients): Promise<HelmChartSummary[]> {
  const releases = await listHelmReleases(clients)
  const byChart = new Map<string, HelmChartSummary>()

  for (const release of releases) {
    const key = `${release.chartName}@${release.chartVersion}`
    const existing = byChart.get(key)
    if (existing) {
      existing.releaseCount += 1
      if (!existing.namespaces.includes(release.namespace)) {
        existing.namespaces.push(release.namespace)
      }
    } else {
      byChart.set(key, {
        id: key,
        chartName: release.chartName,
        chartVersion: release.chartVersion,
        appVersion: release.appVersion,
        releaseCount: 1,
        namespaces: [release.namespace]
      })
    }
  }

  return Array.from(byChart.values()).sort((a, b) => a.chartName.localeCompare(b.chartName))
}

/** Full revision history of a single release, newest first — every `sh.helm.release.v1.<name>.v*`
 * secret Helm has ever written for it. */
export async function getHelmReleaseHistory(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<HelmReleaseHistoryEntry[]> {
  const res = await clients.core.listNamespacedSecret({
    namespace,
    labelSelector: `owner=helm,name=${name}`
  })
  const entries: HelmReleaseHistoryEntry[] = []
  for (const secret of res.items) {
    const raw = secret.data?.release
    if (!raw) continue
    const decoded = decodeReleaseSecret(raw)
    if (!decoded) continue
    entries.push({
      id: secret.metadata?.uid ?? `${namespace}/${name}/${decoded.version}`,
      revision: decoded.version,
      status: decoded.info?.status ?? 'unknown',
      chartName: decoded.chart?.metadata?.name ?? '-',
      chartVersion: decoded.chart?.metadata?.version ?? '-',
      appVersion: decoded.chart?.metadata?.appVersion ?? '',
      updated: decoded.info?.last_deployed ?? null,
      description: decoded.info?.description ?? ''
    })
  }
  return entries.sort((a, b) => b.revision - a.revision)
}

/** Fields the API server manages itself — must be stripped before re-applying an old manifest,
 * otherwise a stale resourceVersion/uid can cause the request to be rejected. */
function sanitizeForApply(obj: KubernetesObject): KubernetesObject {
  const clone = structuredClone(obj) as KubernetesObject & { status?: unknown }
  if (clone.metadata) {
    delete clone.metadata.resourceVersion
    delete clone.metadata.uid
    delete clone.metadata.creationTimestamp
    delete clone.metadata.generation
    delete clone.metadata.managedFields
    delete clone.metadata.selfLink
  }
  delete clone.status
  return clone
}

/** Rolls a Helm release back to a previous revision:
 *  1. re-applies that revision's rendered manifest to the cluster (server-side apply, so it both
 *     creates resources that were since deleted and updates ones that drifted), then
 *  2. records the rollback as a brand-new revision in Helm's own storage format, marking whatever
 *     was previously "deployed" as "superseded" — mirroring what `helm rollback` itself does.
 * Note: unlike the real Helm client this does not run chart hooks and does not delete resources
 * that existed in a later revision but not in the target one. */
export async function rollbackHelmRelease(
  clients: ClusterClients,
  namespace: string,
  name: string,
  targetRevision: number
): Promise<{ newRevision: number; warnings: string[] }> {
  const revisions = await listReleaseSecrets(clients, `owner=helm,name=${name}`)
  const inNamespace = revisions.filter((r) => r.decoded.namespace === namespace)
  const target = inNamespace.find((r) => r.decoded.version === targetRevision)
  if (!target) {
    throw new Error(`Revision ${targetRevision} not found for release ${name}`)
  }

  const latestRevision = Math.max(...inNamespace.map((r) => r.decoded.version))
  const currentlyDeployed = inNamespace.find((r) => r.decoded.info?.status === 'deployed')

  const warnings: string[] = []
  const docs = parseAllDocuments(target.decoded.manifest ?? '')
  for (const doc of docs) {
    const parsed = doc.toJS() as KubernetesObject | null
    if (!parsed || !parsed.apiVersion || !parsed.kind) continue
    if (!parsed.metadata) parsed.metadata = {}
    if (!parsed.metadata.namespace) parsed.metadata.namespace = namespace
    try {
      await clients.objects.patch(
        sanitizeForApply(parsed),
        undefined,
        undefined,
        'magiclens-helm-rollback',
        true,
        PatchStrategy.ServerSideApply
      )
    } catch (err) {
      warnings.push(
        `${parsed.kind}/${parsed.metadata.name ?? '?'}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  if (currentlyDeployed && currentlyDeployed.decoded.version !== targetRevision) {
    const supersededRelease: DecodedHelmRelease = {
      ...currentlyDeployed.decoded,
      info: { ...currentlyDeployed.decoded.info, status: 'superseded' }
    }
    await clients.core.replaceNamespacedSecret({
      name: releaseSecretName(name, currentlyDeployed.decoded.version),
      namespace,
      body: {
        ...currentlyDeployed.secret,
        metadata: { ...currentlyDeployed.secret.metadata, labels: { ...currentlyDeployed.secret.metadata?.labels, status: 'superseded' } },
        data: { ...currentlyDeployed.secret.data, release: encodeReleaseSecret(supersededRelease) }
      }
    })
  }

  const newRevision = latestRevision + 1
  const rolledBackRelease: DecodedHelmRelease = {
    ...target.decoded,
    version: newRevision,
    info: {
      ...target.decoded.info,
      status: 'deployed',
      description: `Rollback to ${targetRevision}`,
      last_deployed: new Date().toISOString()
    }
  }

  await clients.core.createNamespacedSecret({
    namespace,
    body: {
      metadata: {
        name: releaseSecretName(name, newRevision),
        namespace,
        labels: { name, owner: 'helm', status: 'deployed', version: String(newRevision) }
      },
      type: 'helm.sh/release.v1',
      data: { release: encodeReleaseSecret(rolledBackRelease) }
    }
  })

  return { newRevision, warnings }
}
