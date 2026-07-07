import type { QueryClient } from '@tanstack/react-query'

/** Stop in-flight polling for a cluster after disconnect. */
export function cancelClusterQueries(queryClient: QueryClient, clusterId: string): void {
  void queryClient.cancelQueries({
    predicate: (query) => {
      const key = query.queryKey
      return Array.isArray(key) && key.includes(clusterId)
    }
  })
}
