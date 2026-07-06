import { useQuery } from '@tanstack/react-query'

export function useNamespaces(clusterId: string | null) {
  return useQuery({
    queryKey: ['namespaces', clusterId],
    queryFn: () => window.api.cluster.listNamespaces({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}
