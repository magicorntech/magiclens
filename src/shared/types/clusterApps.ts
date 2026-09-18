import type { ClusterIdRequest } from './cluster'

export const CLUSTER_APP_KINDS = ['argocd', 'prometheus', 'grafana'] as const

export type ClusterAppKind = (typeof CLUSTER_APP_KINDS)[number]

export type ClusterAppSource = 'manual' | 'auto' | 'none'

export interface ClusterAppInfo {
  kind: ClusterAppKind
  found: boolean
  source: ClusterAppSource
  displayName: string
  namespace?: string
  serviceName?: string
  servicePort?: number
  /** Ingress / LoadBalancer URL when the Service is exposed outside the cluster. */
  externalUrl?: string
  username?: string
  password?: string
  secretName?: string
  error?: string
}

export interface ClusterAppsDiscoverResponse {
  apps: ClusterAppInfo[]
}

export interface ClusterAppOpenRequest extends ClusterIdRequest {
  kind: ClusterAppKind
}

export interface ClusterAppSaveManualRequest extends ClusterIdRequest {
  kind: ClusterAppKind
  url: string
  username: string
  password: string
}

export type ClusterAppOpenResponse =
  | {
      ok: true
      url: string
      displayName: string
      namespace?: string
      serviceName?: string
      username?: string
      password?: string
      source: Exclude<ClusterAppSource, 'none'>
    }
  | { ok: false; error: string; missing?: boolean }
