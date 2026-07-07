import type { ResourceKind } from '../resourceKinds'

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

export interface HelmChartReleaseRef {
  namespace: string
  name: string
}

export interface HelmChartSummary {
  id: string
  chartName: string
  chartVersion: string
  appVersion: string
  releaseCount: number
  namespaces: string[]
  releases: HelmChartReleaseRef[]
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

export interface HelmUninstallChartRequest {
  clusterId: string
  chartName: string
  chartVersion: string
}

export type HelmUninstallChartResponse =
  | { ok: true; uninstalled: HelmChartReleaseRef[]; warnings: string[] }
  | { error: string }

export interface HelmUninstallReleaseRequest {
  clusterId: string
  namespace: string
  name: string
}

export type HelmUninstallReleaseResponse = { ok: true; warnings: string[] } | { error: string }

export interface HelmReleaseDetailRequest {
  clusterId: string
  namespace: string
  name: string
}

export interface HelmManifestResource {
  id: string
  kind: string
  apiVersion: string
  name: string
  namespace: string
  /** Built-in MagicLens resource kind when supported; null for CRDs / unknown kinds. */
  resourceKind: ResourceKind | null
}

export interface HelmReleaseDetail {
  revision: number
  status: string
  chartName: string
  chartVersion: string
  appVersion: string
  updated: string | null
  valuesYaml: string
  resources: HelmManifestResource[]
}

export type HelmReleaseDetailResponse = { detail: HelmReleaseDetail } | { error: string }
