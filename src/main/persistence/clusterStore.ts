import { safeStorage } from 'electron'
import Store from 'electron-store'
import { findExistingCluster } from '@shared/clusterIdentity'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import type { PersistedClusterEntry } from '@shared/types/cluster'

// The `source` field (kubeconfig file path or pasted raw YAML) is encrypted at rest via
// Electron's safeStorage (OS keychain on macOS, DPAPI on Windows, libsecret on Linux).
// Everything else is plaintext/searchable metadata.
type StoredEntry = Omit<PersistedClusterEntry, 'source'> & { encryptedSource: string }

// Entries written before the encryption + customName rename (pre-Stage-1) had a plaintext
// `source` field and `displayName` instead of `customName`. Read defensively so old local
// stores don't crash the app; they get rewritten in the new format on next save.
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
  clusters: RawStoredEntry[]
}

const store = new Store<StoreSchema>({
  name: 'clusters',
  defaults: { clusters: [] }
})

// safeStorage.isEncryptionAvailable() requires the app 'ready' event to have fired on
// Windows/Linux, so this must be checked lazily (at call time via IPC, never at module load).
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

export function listClusters(): PersistedClusterEntry[] {
  return store.get('clusters').map(toPersisted)
}

function saveCluster(entry: PersistedClusterEntry): void {
  const stored = store.get('clusters').filter((c) => c.id !== entry.id)
  stored.push(toStored(entry))
  store.set('clusters', stored)
}

export function addCluster(entry: PersistedClusterEntry): 'added' | 'duplicate' {
  const clusters = listClusters()
  if (findExistingCluster(clusters.filter((c) => c.id !== entry.id), entry, entry.endpoint)) {
    return 'duplicate'
  }
  saveCluster(entry)
  return 'added'
}

export function updateCluster(entry: PersistedClusterEntry): void {
  saveCluster(entry)
}

export function removeCluster(id: string): void {
  store.set(
    'clusters',
    store.get('clusters').filter((c) => c.id !== id)
  )
}
