import { safeStorage } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { clusterDedupeKey, findExistingCluster, pickCanonicalCluster } from '@shared/clusterIdentity'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import { exportScopedKubeconfigYaml } from '../k8s/kubeconfigExport'
import { authFingerprintForContext, buildKubeConfig } from '../k8s/kubeconfigParser'
import { orgKubeconfigFilePath } from '../k8s/kubeconfigPaths'
import { getSessionScope } from './sessionScope'

type StoredEntry = Omit<PersistedClusterEntry, 'source'> & { encryptedSource: string }

interface LegacyStoredEntry {
  id: string
  displayName?: string
  contextName: string
  source?: KubeconfigSource
  selectedNamespace: string
  selectedResourceKind: PersistedClusterEntry['selectedResourceKind']
}

type RawStoredEntry = StoredEntry | LegacyStoredEntry

interface StoreSchema {
  scopes?: Record<string, RawStoredEntry[]>
  /** @deprecated legacy flat list — migrated to scopes.offline */
  clusters?: RawStoredEntry[]
}

const store = new Store<StoreSchema>({
  name: 'clusters',
  defaults: { scopes: {} }
})

let warnedAboutPlaintext = false

function isEncryptionAvailable(): boolean {
  const available = safeStorage.isEncryptionAvailable()
  if (!available && !warnedAboutPlaintext) {
    warnedAboutPlaintext = true
    console.warn('[magiclens] OS-level encryption is unavailable; kubeconfig sources will be stored in plaintext.')
  }
  return available
}

function encryptSource(source: KubeconfigSource): string {
  const json = JSON.stringify(source)
  if (!isEncryptionAvailable()) return json
  return safeStorage.encryptString(json).toString('base64')
}

function decryptSource(encoded: string): KubeconfigSource {
  if (!isEncryptionAvailable()) return JSON.parse(encoded)
  return JSON.parse(safeStorage.decryptString(Buffer.from(encoded, 'base64')))
}

function isLegacyEntry(raw: RawStoredEntry): raw is LegacyStoredEntry {
  return !('encryptedSource' in raw)
}

function toPersisted(raw: RawStoredEntry): PersistedClusterEntry {
  if (isLegacyEntry(raw)) {
    return {
      id: raw.id,
      customName: raw.displayName ?? raw.contextName,
      contextName: raw.contextName,
      source: raw.source as KubeconfigSource,
      isFavorite: false,
      selectedNamespace: raw.selectedNamespace,
      selectedResourceKind: raw.selectedResourceKind
    }
  }
  const { encryptedSource, ...rest } = raw
  return { ...rest, source: decryptSource(encryptedSource) }
}

function toStored(entry: PersistedClusterEntry): StoredEntry {
  const { source, ...rest } = entry
  return { ...rest, encryptedSource: encryptSource(source) }
}

function migrateLegacyIfNeeded(): void {
  const legacy = store.get('clusters')
  if (!legacy?.length) return
  const scopes = { ...(store.get('scopes') ?? {}) }
  if (!scopes.offline?.length) {
    scopes.offline = legacy
    store.set('scopes', scopes)
  }
  store.delete('clusters' as keyof StoreSchema)
}

function scopeEntries(): RawStoredEntry[] {
  migrateLegacyIfNeeded()
  const scopes = store.get('scopes') ?? {}
  return scopes[getSessionScope()] ?? []
}

function writeScopeEntries(entries: RawStoredEntry[]): void {
  migrateLegacyIfNeeded()
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = entries
  store.set('scopes', scopes)
}

export function listClusters(): PersistedClusterEntry[] {
  return scopeEntries().map(toPersisted)
}

function saveCluster(entry: PersistedClusterEntry): void {
  const stored = scopeEntries().filter((c) => c.id !== entry.id)
  stored.push(toStored(entry))
  writeScopeEntries(stored)
}

function enrichIdentity(entry: PersistedClusterEntry): PersistedClusterEntry {
  if (entry.authFingerprint && entry.endpoint) return entry
  try {
    const kc = buildKubeConfig(entry.source, entry.contextName)
    const cluster = kc.getCurrentCluster()
    return {
      ...entry,
      endpoint: entry.endpoint || cluster?.server,
      authFingerprint: entry.authFingerprint || authFingerprintForContext(kc, entry.contextName)
    }
  } catch {
    return entry
  }
}

export function addCluster(
  entry: PersistedClusterEntry,
  options?: { force?: boolean }
): 'added' | 'duplicate' {
  const enriched = enrichIdentity(entry)
  const clusters = listClusters().map(enrichIdentity)
  if (
    !options?.force &&
    findExistingCluster(
      clusters.filter((c) => c.id !== enriched.id),
      enriched,
      enriched.endpoint
    )
  ) {
    return 'duplicate'
  }
  saveCluster(enriched)
  return 'added'
}

/** Collapse duplicate clusters (same identity) into one entry each. */
export function dedupeClusters(): {
  kept: number
  removedIds: string[]
  groupsMerged: number
} {
  const clusters = listClusters().map(enrichIdentity)
  const groups = new Map<string, PersistedClusterEntry[]>()

  for (const entry of clusters) {
    const key = clusterDedupeKey(entry)
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }

  const keptEntries: PersistedClusterEntry[] = []
  const removedIds: string[] = []
  let groupsMerged = 0

  for (const group of groups.values()) {
    if (group.length === 1) {
      keptEntries.push(group[0]!)
      continue
    }
    groupsMerged += 1
    const canonical = pickCanonicalCluster(group)
    const merged: PersistedClusterEntry = {
      ...canonical,
      endpoint: canonical.endpoint || group.find((g) => g.endpoint)?.endpoint,
      authFingerprint: canonical.authFingerprint || group.find((g) => g.authFingerprint)?.authFingerprint,
      isFavorite: group.some((g) => g.isFavorite),
      logoUrl: canonical.logoUrl || group.find((g) => g.logoUrl)?.logoUrl,
      backgroundId: canonical.backgroundId || group.find((g) => g.backgroundId)?.backgroundId,
      backgroundCustomUrl:
        canonical.backgroundCustomUrl || group.find((g) => g.backgroundCustomUrl)?.backgroundCustomUrl,
      prometheusUrl: canonical.prometheusUrl || group.find((g) => g.prometheusUrl)?.prometheusUrl
    }
    keptEntries.push(merged)
    for (const extra of group) {
      if (extra.id !== canonical.id) removedIds.push(extra.id)
    }
  }

  writeScopeEntries(keptEntries.map(toStored))
  return { kept: keptEntries.length, removedIds, groupsMerged }
}

export function updateCluster(entry: PersistedClusterEntry): void {
  saveCluster(entry)
}

export function removeCluster(id: string): void {
  writeScopeEntries(scopeEntries().filter((c) => c.id !== id))
}

function deleteOrgKubeconfigFile(filePath: string | undefined): void {
  if (!filePath) return
  if (!filePath.includes('/kubeconfigs/')) return
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath)
    } catch {
      // ignore
    }
  }
}

export function upsertOrgCluster(input: {
  remoteId: string
  orgKubeconfigId: string
  customName: string
  contextName: string
  source?: KubeconfigSource
  yamlContent?: string
  userEmail?: string
  endpoint?: string
  environment?: string
}): PersistedClusterEntry {
  const clusters = listClusters().map(enrichIdentity)
  let source = input.source
  let localKubeconfigPath: string | undefined

  if (input.yamlContent && input.userEmail) {
    const scopedYaml = exportScopedKubeconfigYaml(
      { type: 'raw', yaml: input.yamlContent },
      input.contextName
    )
    localKubeconfigPath = orgKubeconfigFilePath(input.userEmail, input.contextName)
    writeFileSync(localKubeconfigPath, scopedYaml, 'utf-8')
    // Keep raw in encrypted store so connect works even if the on-disk file is missing.
    source = { type: 'raw', yaml: scopedYaml }
  }

  if (!source) throw new Error('upsertOrgCluster requires source or yamlContent+userEmail')

  const draft = enrichIdentity({
    id: randomUUID(),
    customName: input.customName,
    contextName: input.contextName,
    source,
    endpoint: input.endpoint,
    isFavorite: false,
    selectedNamespace: 'ALL',
    selectedResourceKind: null
  })

  const existingOrg = clusters.find((c) => c.origin === 'org' && c.remoteId === input.remoteId)
  const existingLocal = findExistingCluster(
    clusters.filter((c) => c.origin !== 'org'),
    draft,
    draft.endpoint
  )
  const existing = existingOrg ?? existingLocal

  if (
    existing?.localKubeconfigPath &&
    existing.localKubeconfigPath !== localKubeconfigPath
  ) {
    deleteOrgKubeconfigFile(existing.localKubeconfigPath)
  }
  if (existing?.source.type === 'file' && existing.source.filePath !== localKubeconfigPath) {
    deleteOrgKubeconfigFile(existing.source.filePath)
  }

  const entry: PersistedClusterEntry = {
    id: existing?.id ?? draft.id,
    customName: input.customName,
    contextName: input.contextName,
    source,
    endpoint: draft.endpoint ?? existing?.endpoint,
    authFingerprint: draft.authFingerprint ?? existing?.authFingerprint,
    environment: input.environment,
    logoUrl: existing?.logoUrl,
    backgroundId: existing?.backgroundId,
    backgroundCustomUrl: existing?.backgroundCustomUrl,
    backgroundPanelOpacity: existing?.backgroundPanelOpacity,
    prometheusUrl: existing?.prometheusUrl,
    isFavorite: existing?.isFavorite ?? false,
    selectedNamespace: existing?.selectedNamespace ?? 'ALL',
    selectedResourceKind: existing?.selectedResourceKind ?? null,
    lastOpenedAt: existing?.lastOpenedAt,
    origin: 'org',
    remoteId: input.remoteId,
    orgKubeconfigId: input.orgKubeconfigId,
    localKubeconfigPath: localKubeconfigPath ?? existing?.localKubeconfigPath
  }

  saveCluster(entry)
  return entry
}

/**
 * Prune org clusters that are no longer assigned.
 * Only remove stale contexts for kubeconfigs that were successfully re-synced —
 * a failed download must not delete a previously working local file/entry.
 */
export function removeOrgClustersMissing(
  orgKubeconfigIds: Set<string>,
  syncedRemoteIds: Set<string>,
  successfullySyncedOrgIds: Set<string>
): string[] {
  const removed: string[] = []
  const kept: RawStoredEntry[] = []
  for (const raw of scopeEntries()) {
    const entry = toPersisted(raw)
    if (entry.origin !== 'org' || !entry.orgKubeconfigId) {
      kept.push(raw)
      continue
    }

    if (!orgKubeconfigIds.has(entry.orgKubeconfigId)) {
      deleteOrgKubeconfigFile(entry.localKubeconfigPath)
      if (entry.source.type === 'file') deleteOrgKubeconfigFile(entry.source.filePath)
      removed.push(entry.id)
      continue
    }

    if (
      successfullySyncedOrgIds.has(entry.orgKubeconfigId) &&
      entry.remoteId &&
      !syncedRemoteIds.has(entry.remoteId)
    ) {
      deleteOrgKubeconfigFile(entry.localKubeconfigPath)
      if (entry.source.type === 'file') deleteOrgKubeconfigFile(entry.source.filePath)
      removed.push(entry.id)
      continue
    }

    kept.push(raw)
  }
  writeScopeEntries(kept)
  return removed
}
