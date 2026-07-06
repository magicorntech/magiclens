import { useQuery } from '@tanstack/react-query'

export function usePortForwards(clusterId: string) {
  return useQuery({
    queryKey: ['port-forwards', clusterId],
    queryFn: () => window.api.portForward.list({ clusterId }),
    enabled: !!clusterId,
    refetchInterval: 2000
  })
}
