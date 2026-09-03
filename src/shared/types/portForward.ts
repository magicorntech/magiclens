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
  /** ISO timestamp of when the forward was started. */
  startedAt: string
  /** ISO timestamp of when the last local connection closed, or null while one is still open. */
  idleSince: string | null
}

export interface PortForwardSettings {
  /** Minutes a forward may sit with no open local connection before it's stopped automatically. 0 = never. */
  idleTimeoutMinutes: number
}

export const PORT_FORWARD_IDLE_TIMEOUT_OPTIONS = [0, 15, 30, 60, 120, 240] as const

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

export interface PortForwardListAllResponse {
  sessions: PortForwardSession[]
}
