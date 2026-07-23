import type { KubeconfigSource } from './types/kubeconfig'

export interface ClusterIdentityFields {
  contextName: string
  source: KubeconfigSource
  endpoint?: string
  customName?: string
  /** Stable hash of the kubeconfig user auth for this context (token/cert/exec). */
  authFingerprint?: string
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase()
}

function normalizeName(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** Normalize API server URLs for comparison (strip trailing slash). */
export function normalizeEndpoint(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '').toLowerCase()
}

function sourcesEqual(a: KubeconfigSource, b: KubeconfigSource): boolean {
  if (a.type === 'file' && b.type === 'file') {
    return normalizePath(a.filePath) === normalizePath(b.filePath)
  }
  if (a.type === 'raw' && b.type === 'raw') {
    return a.yaml.trim() === b.yaml.trim()
  }
  return false
}

/**
 * Identity key used to group duplicates.
 * Prefer auth + server when available; fall back to display name + server, then source path.
 */
export function clusterDedupeKey(entry: ClusterIdentityFields): string {
  const ctx = normalizeName(entry.contextName)
  const server = normalizeEndpoint(entry.endpoint)
  const auth = entry.authFingerprint?.trim()
  const name = normalizeName(entry.customName) || ctx

  if (auth && server) return `auth:${ctx}::${server}::${auth}`
  if (auth) return `auth:${ctx}::${auth}`
  if (server) return `server:${ctx}::${server}`
  if (name && server) return `name:${name}::${server}`

  if (entry.source.type === 'file') {
    return `file:${ctx}::${normalizePath(entry.source.filePath)}`
  }
  return `raw:${ctx}::${entry.source.yaml.trim().length}:${hashString(entry.source.yaml.trim())}`
}

function hashString(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

/** Returns true when an incoming context matches an already-saved cluster entry. */
export function isSameClusterIdentity(
  existing: ClusterIdentityFields,
  incoming: ClusterIdentityFields,
  incomingServer?: string
): boolean {
  const existingCtx = normalizeName(existing.contextName)
  const incomingCtx = normalizeName(incoming.contextName)
  const existingServer = normalizeEndpoint(existing.endpoint)
  const incomingServerNorm = normalizeEndpoint(incomingServer ?? incoming.endpoint)

  if (sourcesEqual(existing.source, incoming.source) && existingCtx === incomingCtx) {
    return true
  }

  const existingAuth = existing.authFingerprint?.trim()
  const incomingAuth = incoming.authFingerprint?.trim()
  if (existingAuth && incomingAuth && existingAuth === incomingAuth) {
    if (existingCtx === incomingCtx) return true
    if (existingServer && incomingServerNorm && existingServer === incomingServerNorm) return true
  }

  if (existingCtx === incomingCtx && existingServer && incomingServerNorm && existingServer === incomingServerNorm) {
    return true
  }

  const existingName = normalizeName(existing.customName) || existingCtx
  const incomingName = normalizeName(incoming.customName) || incomingCtx
  if (
    existingName &&
    incomingName &&
    existingName === incomingName &&
    existingServer &&
    incomingServerNorm &&
    existingServer === incomingServerNorm
  ) {
    return true
  }

  return false
}

export function findExistingCluster<T extends ClusterIdentityFields & { customName?: string; id?: string }>(
  clusters: T[],
  incoming: ClusterIdentityFields,
  incomingServer?: string
): T | undefined {
  return clusters.find((c) => isSameClusterIdentity(c, incoming, incomingServer))
}

export interface DedupePickable {
  id: string
  origin?: 'local' | 'org'
  isFavorite?: boolean
  lastOpenedAt?: string
  endpoint?: string
  authFingerprint?: string
}

/** Prefer org-synced, favorites, richer metadata, then most recently opened. */
export function pickCanonicalCluster<T extends DedupePickable>(group: T[]): T {
  return [...group].sort((a, b) => {
    const org = Number(b.origin === 'org') - Number(a.origin === 'org')
    if (org !== 0) return org
    const fav = Number(!!b.isFavorite) - Number(!!a.isFavorite)
    if (fav !== 0) return fav
    const auth = Number(!!b.authFingerprint) - Number(!!a.authFingerprint)
    if (auth !== 0) return auth
    const ep = Number(!!b.endpoint) - Number(!!a.endpoint)
    if (ep !== 0) return ep
    const aOpened = a.lastOpenedAt ? Date.parse(a.lastOpenedAt) : 0
    const bOpened = b.lastOpenedAt ? Date.parse(b.lastOpenedAt) : 0
    return bOpened - aOpened
  })[0]!
}
