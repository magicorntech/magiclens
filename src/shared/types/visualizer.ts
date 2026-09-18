export type VisualizerWorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet'
export type VisualizerNodeKind = VisualizerWorkloadKind | 'Service'

export type VisualizerHealth = 'healthy' | 'degraded' | 'error' | 'unknown'

export interface VisualizerPort {
  port: number
  name?: string
  protocol?: string
}

export interface VisualizerNode {
  id: string
  kind: VisualizerNodeKind
  name: string
  namespace: string
  instance: string
  status: VisualizerHealth
  images: string[]
  replicasReady?: number
  replicasDesired?: number
  serviceType?: string
  ports?: VisualizerPort[]
  hasIngress: boolean
  hasEgress: boolean
}

export interface VisualizerEdge {
  id: string
  source: string
  target: string
}

export interface VisualizerGraphRequest {
  clusterId: string
  /** Namespace selection: single name, comma-joined list, or 'ALL'. */
  namespace: string | 'ALL'
}

export interface VisualizerGraphResponse {
  nodes: VisualizerNode[]
  edges: VisualizerEdge[]
}
