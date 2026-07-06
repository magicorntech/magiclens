import { useQuery } from '@tanstack/react-query'

export function useHelmReleases(clusterId: string | null) {
  return useQuery({
    queryKey: ['helm-releases', clusterId],
    queryFn: () => window.api.helm.listReleases({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

export function useHelmCharts(clusterId: string | null) {
  return useQuery({
    queryKey: ['helm-charts', clusterId],
    queryFn: () => window.api.helm.listCharts({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

export function useHelmHistory(clusterId: string | null, namespace: string | null, name: string | null) {
  return useQuery({
    queryKey: ['helm-history', clusterId, namespace, name],
    queryFn: () =>
      window.api.helm.getHistory({ clusterId: clusterId as string, namespace: namespace as string, name: name as string }),
    enabled: !!clusterId && !!namespace && !!name
  })
}
