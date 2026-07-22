import { safeStorage } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { VpnOrigin, VpnProfileEntry, VpnProfileSummary, VpnProvider } from '@shared/types/vpn'
import { detectVpnProvider, parseVpnConfigMeta, vpnRequiresAuth } from '@shared/types/vpn'
import { getSessionScope } from './sessionScope'

type StoredEntry = Omit<VpnProfileEntry, 'config'> & { encryptedConfig: string }

interface StoreSchema {
  scopes?: Record<string, StoredEntry[]>
  /** @deprecated legacy flat list — migrated to scopes.offline */
  profiles?: StoredEntry[]
}

const store = new Store<StoreSchema>({
  name: 'vpn-profiles',
  defaults: { scopes: {} }
})

let warnedAboutPlaintext = false

function isEncryptionAvailable(): boolean {
  const available = safeStorage.isEncryptionAvailable()
  if (!available && !warnedAboutPlaintext) {
    warnedAboutPlaintext = true
    console.warn('[magiclens] OS-level encryption unavailable; VPN configs stored in plaintext.')
  }
  return available
}

function encryptConfig(config: string): string {
  if (!isEncryptionAvailable()) return config
  return safeStorage.encryptString(config).toString('base64')
}

function decryptConfig(encoded: string): string {
  if (!isEncryptionAvailable()) return encoded
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}

function toEntry(raw: StoredEntry): VpnProfileEntry {
  const { encryptedConfig, ...rest } = raw
  const config = decryptConfig(encryptedConfig)
  const parsed = parseVpnConfigMeta(config, rest.name)
  return {
    ...rest,
    config,
    username: rest.username ?? parsed.username,
    organization: rest.organization ?? parsed.organization,
    serverHost: rest.serverHost ?? parsed.serverHost,
    serverName: rest.serverName ?? parsed.serverName,
    protocol: rest.protocol ?? parsed.protocol
  }
}

function toStored(entry: VpnProfileEntry): StoredEntry {
  const { config, ...rest } = entry
  return { ...rest, encryptedConfig: encryptConfig(config) }
}

function toSummary(entry: VpnProfileEntry): VpnProfileSummary {
  const { config, ...rest } = entry
  return {
    ...rest,
    hasConfig: config.trim().length > 0,
    requiresAuth: vpnRequiresAuth(entry.provider, config)
  }
}

function migrateLegacyIfNeeded(): void {
  const legacy = store.get('profiles')
  if (!legacy?.length) return
  const scopes = { ...(store.get('scopes') ?? {}) }
  if (!scopes.offline?.length) {
    scopes.offline = legacy
    store.set('scopes', scopes)
  }
  store.delete('profiles' as keyof StoreSchema)
}

function scopeProfiles(): StoredEntry[] {
  migrateLegacyIfNeeded()
  const scopes = store.get('scopes') ?? {}
  return scopes[getSessionScope()] ?? []
}

function writeScopeProfiles(entries: StoredEntry[]): void {
  migrateLegacyIfNeeded()
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = entries
  store.set('scopes', scopes)
}

export function listVpnProfiles(): VpnProfileSummary[] {
  return scopeProfiles().map((p) => toSummary(toEntry(p)))
}

export function getVpnProfile(id: string): VpnProfileEntry | null {
  const raw = scopeProfiles().find((p) => p.id === id)
  return raw ? toEntry(raw) : null
}

export function upsertVpnProfile(input: {
  id?: string
  name: string
  provider?: VpnProvider
  origin: VpnOrigin
  remoteId?: string
  description?: string
  username?: string
  organization?: string
  serverHost?: string
  serverName?: string
  protocol?: string
  config: string
}): VpnProfileEntry {
  const now = new Date().toISOString()
  const existing = input.id
    ? scopeProfiles().find((p) => p.id === input.id)
    : input.remoteId
      ? scopeProfiles().find((p) => p.remoteId === input.remoteId && p.origin === 'org')
      : undefined

  const provider =
    input.provider ?? detectVpnProvider(input.config, input.provider, input.name)

  const parsed = parseVpnConfigMeta(input.config, input.name)
  const existingEntry = existing ? toEntry(existing) : null

  const entry: VpnProfileEntry = {
    id: existing?.id ?? input.id ?? randomUUID(),
    name: input.name || parsed.suggestedName || 'VPN profile',
    provider,
    origin: input.origin,
    remoteId: input.remoteId,
    description: input.description,
    username:
      input.username !== undefined ? input.username : (parsed.username ?? existingEntry?.username),
    organization:
      input.organization !== undefined
        ? input.organization
        : (parsed.organization ?? existingEntry?.organization),
    serverHost:
      input.serverHost !== undefined
        ? input.serverHost
        : (parsed.serverHost ?? existingEntry?.serverHost),
    serverName:
      input.serverName !== undefined
        ? input.serverName
        : (parsed.serverName ?? existingEntry?.serverName),
    protocol:
      input.protocol !== undefined ? input.protocol : (parsed.protocol ?? existingEntry?.protocol),
    config: input.config,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now
  }

  const next = scopeProfiles().filter((p) => p.id !== entry.id)
  next.push(toStored(entry))
  writeScopeProfiles(next)
  return entry
}

export function updateVpnProfileMeta(
  id: string,
  patch: {
    name?: string
    username?: string
    organization?: string
    serverHost?: string
    serverName?: string
    protocol?: string
    description?: string
  }
): VpnProfileEntry | null {
  const current = getVpnProfile(id)
  if (!current) return null
  return upsertVpnProfile({
    id: current.id,
    name: patch.name ?? current.name,
    provider: current.provider,
    origin: current.origin,
    remoteId: current.remoteId,
    description: patch.description !== undefined ? patch.description : current.description,
    username: patch.username !== undefined ? patch.username : current.username,
    organization: patch.organization !== undefined ? patch.organization : current.organization,
    serverHost: patch.serverHost !== undefined ? patch.serverHost : current.serverHost,
    serverName: patch.serverName !== undefined ? patch.serverName : current.serverName,
    protocol: patch.protocol !== undefined ? patch.protocol : current.protocol,
    config: current.config
  })
}

export function removeVpnProfile(id: string): boolean {
  const before = scopeProfiles()
  const next = before.filter((p) => p.id !== id)
  writeScopeProfiles(next)
  return next.length !== before.length
}

export function removeOrgVpnMissing(remoteIds: Set<string>): string[] {
  const removed: string[] = []
  const next = scopeProfiles().filter((p) => {
    if (p.origin !== 'org' || !p.remoteId) return true
    if (remoteIds.has(p.remoteId)) return true
    removed.push(p.id)
    return false
  })
  writeScopeProfiles(next)
  return removed
}
