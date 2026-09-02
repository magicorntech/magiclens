import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ArgoBulkActionRequest } from '@shared/types/argocd'

/** Argo's controller reconciles continuously, so the dashboard is polled rather than watched. */
const REFETCH_MS = 15_000

export function useArgoOverview(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-overview', clusterId],
    queryFn: () => window.api.argocd.getOverview({ clusterId: clusterId as string }),
    enabled: !!clusterId,
    refetchInterval: REFETCH_MS
  })
}

export function useArgoApplications(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-applications', clusterId],
    queryFn: () => window.api.argocd.listApplications({ clusterId: clusterId as string }),
    enabled: !!clusterId,
    refetchInterval: REFETCH_MS
  })
}

export function useArgoApplicationSets(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-application-sets', clusterId],
    queryFn: () => window.api.argocd.listApplicationSets({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

export function useArgoProjects(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-projects', clusterId],
    queryFn: () => window.api.argocd.listProjects({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

export function useArgoRepositories(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-repositories', clusterId],
    queryFn: () => window.api.argocd.listRepositories({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

export function useArgoClusters(clusterId: string | null) {
  return useQuery({
    queryKey: ['argocd-clusters', clusterId],
    queryFn: () => window.api.argocd.listClusters({ clusterId: clusterId as string }),
    enabled: !!clusterId
  })
}

/** Detail for one Application, loaded when its drawer opens. */
export function useArgoApplicationDetail(
  clusterId: string | null,
  target: { namespace: string; name: string } | null
) {
  return useQuery({
    queryKey: ['argocd-application-detail', clusterId, target?.namespace, target?.name],
    queryFn: () =>
      window.api.argocd.getApplicationDetail({
        clusterId: clusterId as string,
        namespace: target?.namespace as string,
        name: target?.name as string
      }),
    enabled: !!clusterId && !!target,
    refetchInterval: REFETCH_MS
  })
}

/**
 * Invalidates every Argo view after a write. Sync and refresh are asynchronous on Argo's side —
 * the controller may take a few seconds — so the polling above is what surfaces the result;
 * this just avoids showing stale data for a full interval.
 */
function useInvalidateArgo(clusterId: string | null) {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [
      'argocd-overview',
      'argocd-applications',
      'argocd-application-sets',
      'argocd-projects',
      'argocd-application-detail'
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key, clusterId] })
    }
  }
}

export function useArgoSync(clusterId: string | null) {
  const invalidate = useInvalidateArgo(clusterId)
  return useMutation({
    mutationFn: (req: { namespace: string; name: string }) =>
      window.api.argocd.syncApplication({ clusterId: clusterId as string, ...req }),
    onSuccess: invalidate
  })
}

export function useArgoRefresh(clusterId: string | null) {
  const invalidate = useInvalidateArgo(clusterId)
  return useMutation({
    mutationFn: (req: { namespace: string; name: string }) =>
      window.api.argocd.refreshApplication({ clusterId: clusterId as string, ...req }),
    onSuccess: invalidate
  })
}

export function useArgoSyncMany(clusterId: string | null) {
  const invalidate = useInvalidateArgo(clusterId)
  return useMutation({
    mutationFn: (targets: ArgoBulkActionRequest['targets']) =>
      window.api.argocd.syncMany({ clusterId: clusterId as string, targets }),
    onSuccess: invalidate
  })
}
