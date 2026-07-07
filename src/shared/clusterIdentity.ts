import type { KubeconfigSource } from './types/kubeconfig'

export interface ClusterIdentityFields {
  contextName: string
  source: KubeconfigSource
  endpoint?: string
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase()
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

/** Returns true when an incoming context matches an already-saved cluster entry. */
export function isSameClusterIdentity(
  existing: ClusterIdentityFields,
  incoming: ClusterIdentityFields,
  incomingServer?: string
): boolean {
  if (existing.contextName !== incoming.contextName) return false

  if (sourcesEqual(existing.source, incoming.source)) return true

  const existingServer = existing.endpoint?.trim()
  const server = (incomingServer ?? incoming.endpoint)?.trim()
  if (existingServer && server && existingServer === server) return true

  return false
}

export function findExistingCluster<T extends ClusterIdentityFields & { customName?: string; id?: string }>(
  clusters: T[],
  incoming: ClusterIdentityFields,
  incomingServer?: string
): T | undefined {
  return clusters.find((c) => isSameClusterIdentity(c, incoming, incomingServer))
}
