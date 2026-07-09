import { useQuery } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'

export function useResourceManifest(
  clusterId: string,
  kind: ResourceKind,
  name: string,
  namespace: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['resource-manifest', clusterId, kind, namespace, name],
    queryFn: async () => {
      const res = await window.api.resource.getManifest({
        clusterId,
        namespace,
        name,
        target: { type: 'builtin', kind }
      })
      if ('error' in res) throw new Error(res.error)
      return res.yaml
    },
    enabled,
    staleTime: 30_000
  })
}
