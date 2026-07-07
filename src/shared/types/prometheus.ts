import type { ClusterIdRequest } from './cluster'

export type PrometheusDiscoveryMethod = 'auto' | 'manual' | 'none'

export interface PrometheusStatus {
  available: boolean
  discoveryMethod: PrometheusDiscoveryMethod
  /** Human-readable base (API server proxy path or external URL). */
  baseUrl?: string
  namespace?: string
  serviceName?: string
  servicePort?: number
  error?: string
  lastCheckedAt: string
}

export interface PrometheusDiscoverRequest extends ClusterIdRequest {
  /** Optional override for this discover run (also persisted on cluster when saved). */
  manualUrl?: string
}

export interface PrometheusQueryRequest extends ClusterIdRequest {
  query: string
  /** Unix timestamp in seconds. */
  time?: number
}

export interface PrometheusQueryRangeRequest extends ClusterIdRequest {
  query: string
  start: number
  end: number
  step: string
}

export type PrometheusMatrixSample = [number, string]

export interface PrometheusMetricSeries {
  metric: Record<string, string>
  value?: PrometheusMatrixSample
  values?: PrometheusMatrixSample[]
}

export interface PrometheusQueryData {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string'
  result: PrometheusMetricSeries[]
}

export interface PrometheusQueryResponse {
  available: boolean
  error?: string
  data?: PrometheusQueryData
}
