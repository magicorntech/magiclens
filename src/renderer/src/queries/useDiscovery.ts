import { useQuery } from '@tanstack/react-query'
import type { CustomResourceKindsRequest } from '@shared/types/discovery'

export function useDiscovery(clusterId: string | null) {
  return useQuery({
    queryKey: ['discovery', clusterId],
    queryFn: () => window.api.discovery.list({ clusterId: clusterId as string }),
    enabled: !!clusterId,
    staleTime: 30_000
  })
}

export function useCustomResourceKinds(clusterId: string | null, onlyWithInstances: boolean) {
  return useQuery({
    queryKey: ['custom-resource-kinds', clusterId, onlyWithInstances],
    queryFn: () =>
      window.api.discovery.listCustomResourceKinds({
        clusterId: clusterId as string,
        onlyWithInstances
      } satisfies CustomResourceKindsRequest),
    enabled: !!clusterId
  })
}

export function useDynamicResourceList(
  clusterId: string | null,
  apiVersion: string | null,
  kind: string | null,
  namespaced: boolean,
  namespace: string
) {
  return useQuery({
    queryKey: ['dynamic-resource-list', clusterId, apiVersion, kind, namespaced, namespace],
    queryFn: () =>
      window.api.discovery.listDynamicResources({
        clusterId: clusterId as string,
        apiVersion: apiVersion as string,
        kind: kind as string,
        namespaced,
        namespace
      }),
    enabled: !!clusterId && !!apiVersion && !!kind
  })
}
