import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  CustomResourceKindsRequest,
  DynamicResourceListResponse
} from '@shared/types/discovery'
import {
  filterItemsByNamespaceSelection,
  isNoNamespaceSelection,
  listNamespaceParam
} from '@shared/namespaceSelection'

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
  namespaceSelection: string,
  refetchInterval: number | false = false
) {
  const noNamespace = isNoNamespaceSelection(namespaceSelection)
  const apiNamespace = namespaced ? listNamespaceParam(namespaceSelection) : 'ALL'
  const canFetch = !namespaced || (!noNamespace && apiNamespace !== null)

  const query = useQuery({
    queryKey: ['dynamic-resource-list', clusterId, apiVersion, kind, namespaced, namespaceSelection],
    queryFn: () =>
      window.api.discovery.listDynamicResources({
        clusterId: clusterId as string,
        apiVersion: apiVersion as string,
        kind: kind as string,
        namespaced,
        namespace: (apiNamespace ?? 'ALL') as string
      }),
    enabled: !!clusterId && !!apiVersion && !!kind && canFetch,
    refetchInterval
  })

  const data = useMemo((): DynamicResourceListResponse | undefined => {
    if (namespaced && noNamespace) return { items: [] }
    if (!query.data) return undefined
    if ('error' in query.data) return query.data
    if (!namespaced) return query.data
    return {
      items: filterItemsByNamespaceSelection(query.data.items, namespaceSelection)
    }
  }, [query.data, namespaceSelection, namespaced, noNamespace])

  return { ...query, data }
}
