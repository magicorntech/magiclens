import type { QueryClient } from '@tanstack/react-query'

/** Stop in-flight work and drop cached query data for a cluster after disconnect. */
export function cancelClusterQueries(queryClient: QueryClient, clusterId: string): void {
  const predicate = (query: { queryKey: readonly unknown[] }): boolean => {
    const key = query.queryKey
    return Array.isArray(key) && key.includes(clusterId)
  }
  void queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({ predicate })
}
