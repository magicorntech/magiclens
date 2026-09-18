import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HelmUninstallChartRequest, HelmUninstallReleaseRequest } from '@shared/types/helm'

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

export function useHelmReleaseDetail(
  clusterId: string | null,
  namespace: string | null,
  name: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['helm-release-detail', clusterId, namespace, name],
    queryFn: () =>
      window.api.helm.getReleaseDetail({
        clusterId: clusterId as string,
        namespace: namespace as string,
        name: name as string
      }),
    enabled: enabled && !!clusterId && !!namespace && !!name
  })
}

export function useHelmCatalog(clusterId: string | null, query: string) {
  return useQuery({
    queryKey: ['helm-catalog-v3', clusterId, query],
    queryFn: () => window.api.helm.searchCatalog({ clusterId: clusterId as string, query }),
    enabled: !!clusterId,
    staleTime: 15_000
  })
}

export function useHelmPackage(
  clusterId: string | null,
  repoName: string | null,
  chartName: string | null,
  version: string | null,
  repoUrl: string | null = null,
  packageId: string | null = null
) {
  return useQuery({
    queryKey: ['helm-package-v4', clusterId, repoName, chartName, version, repoUrl, packageId],
    queryFn: () =>
      window.api.helm.getPackage({
        clusterId: clusterId as string,
        repoName: repoName as string,
        chartName: chartName as string,
        version: version || undefined,
        repoUrl: repoUrl || undefined,
        packageId: packageId || undefined
      }),
    enabled: !!clusterId && !!repoName && !!chartName,
    staleTime: 60_000
  })
}

export function useHelmInstall(clusterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: Omit<import('@shared/types/helm').HelmInstallRequest, 'clusterId'>) =>
      window.api.helm.install({ clusterId, ...req }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helm-charts', clusterId] })
      void queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] })
    }
  })
}

export function useHelmUninstallChart(clusterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: Omit<HelmUninstallChartRequest, 'clusterId'>) =>
      window.api.helm.uninstallChart({ clusterId, ...req }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helm-charts', clusterId] })
      void queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] })
    }
  })
}

export function useHelmUninstallRelease(clusterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: Omit<HelmUninstallReleaseRequest, 'clusterId'>) =>
      window.api.helm.uninstallRelease({ clusterId, ...req }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helm-charts', clusterId] })
      void queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] })
    }
  })
}
