import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import type { ClusterClients } from './clusterManager'
import { clusterManager } from './clusterManager'

export type ClusterNotConnected = { error: typeof CLUSTER_NOT_CONNECTED }

export async function withClusterClients<T>(
  clusterId: string,
  fn: (clients: ClusterClients) => Promise<T>
): Promise<T | ClusterNotConnected> {
  const clients = clusterManager.get(clusterId)
  if (!clients) return { error: CLUSTER_NOT_CONNECTED }
  return fn(clients)
}

export function withClusterClientsSync<T>(
  clusterId: string,
  fn: (clients: ClusterClients) => T
): T | ClusterNotConnected {
  const clients = clusterManager.get(clusterId)
  if (!clients) return { error: CLUSTER_NOT_CONNECTED }
  return fn(clients)
}
