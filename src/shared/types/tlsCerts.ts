import type { ClusterIdRequest } from './cluster'

export const TLS_CERT_WARN_DAYS = 30

export type TlsCertStatus = 'ok' | 'expiring' | 'expired' | 'invalid'

export interface TlsCertInfo {
  namespace: string
  name: string
  subject: string
  issuer: string
  hosts: string[]
  ingressHosts: string[]
  notBefore: string | null
  notAfter: string | null
  daysRemaining: number | null
  status: TlsCertStatus
}

export type TlsCertListRequest = ClusterIdRequest

export type TlsCertListResponse = { items: TlsCertInfo[] } | { error: string }

export function tlsCertKey(namespace: string, name: string): string {
  return `${namespace}/${name}`
}

export function tlsCertStatus(daysRemaining: number | null): TlsCertStatus {
  if (daysRemaining == null) return 'invalid'
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= TLS_CERT_WARN_DAYS) return 'expiring'
  return 'ok'
}
