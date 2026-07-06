import { useQuery } from '@tanstack/react-query'

export function useServiceDetail(clusterId: string, namespace: string, serviceName: string, isActiveTab: boolean) {
  return useQuery({
    queryKey: ['service-detail', clusterId, namespace, serviceName],
    queryFn: () => window.api.service.getDetail({ clusterId, namespace, serviceName }),
    enabled: !!clusterId && !!namespace && !!serviceName && isActiveTab
  })
}
