export type PortForwardSourceKind = 'pod' | 'service'

export interface PortForwardSession {
  id: string
  clusterId: string
  namespace: string
  sourceKind: PortForwardSourceKind
  sourceName: string
  sourcePort: number
  resolvedPodName: string
  resolvedTargetPort: number
  localPort: number
  label: string
}

export interface PortForwardStartPodRequest {
  clusterId: string
  namespace: string
  podName: string
  targetPort: number
  localPort?: number
  label: string
}

export interface PortForwardStartServiceRequest {
  clusterId: string
  namespace: string
  serviceName: string
  port: number
  localPort?: number
  label: string
}

export type PortForwardStartResponse = { ok: true; session: PortForwardSession } | { ok: false; error: string }

export interface PortForwardStopRequest {
  id: string
}

export interface PortForwardListRequest {
  clusterId: string
}

export interface PortForwardListResponse {
  sessions: PortForwardSession[]
}
