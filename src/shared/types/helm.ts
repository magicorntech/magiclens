export interface HelmRelease {
  id: string
  name: string
  namespace: string
  revision: number
  status: string
  chartName: string
  chartVersion: string
  appVersion: string
  updated: string | null
}

export type HelmReleasesResponse = { releases: HelmRelease[] } | { error: string }

export interface HelmChartSummary {
  id: string
  chartName: string
  chartVersion: string
  appVersion: string
  releaseCount: number
  namespaces: string[]
}

export type HelmChartsResponse = { charts: HelmChartSummary[] } | { error: string }

export interface HelmReleaseHistoryEntry {
  id: string
  revision: number
  status: string
  chartName: string
  chartVersion: string
  appVersion: string
  updated: string | null
  description: string
}

export interface HelmReleaseHistoryRequest {
  clusterId: string
  namespace: string
  name: string
}

export type HelmReleaseHistoryResponse = { history: HelmReleaseHistoryEntry[] } | { error: string }

export interface HelmRollbackRequest {
  clusterId: string
  namespace: string
  name: string
  targetRevision: number
}

export type HelmRollbackResponse = { ok: true; newRevision: number; warnings: string[] } | { error: string }
