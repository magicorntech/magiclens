import { useQuery } from '@tanstack/react-query'

export function usePortForwards(clusterId: string) {
  return useQuery({
    queryKey: ['port-forwards', clusterId],
    queryFn: () => window.api.portForward.list({ clusterId }),
    enabled: !!clusterId,
    refetchInterval: 2000
  })
}

export function usePortForwardsAll() {
  return useQuery({
    queryKey: ['port-forwards', 'all'],
    queryFn: () => window.api.portForward.listAll(),
    refetchInterval: 2000
  })
}
