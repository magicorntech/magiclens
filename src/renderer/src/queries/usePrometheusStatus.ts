import { useQuery } from '@tanstack/react-query'

export function usePrometheusStatus(clusterId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['prometheus-status', clusterId],
    queryFn: () => window.api.prometheus.getStatus({ clusterId: clusterId as string }),
    enabled: !!clusterId && enabled,
    staleTime: 30_000
  })
}
