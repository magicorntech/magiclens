import { useQuery } from '@tanstack/react-query'

export function useClusterVersion(clusterId: string | null) {
  return useQuery({
    queryKey: ['cluster-version', clusterId],
    queryFn: () => window.api.cluster.getVersion({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}
