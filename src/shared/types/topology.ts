export type TopologyNodeKind =
  | 'Pod'
  | 'Deployment'
  | 'StatefulSet'
  | 'ReplicaSet'
  | 'Service'
  | 'Ingress'
  | 'ConfigMap'
  | 'External'

export type TopologyHealth = 'healthy' | 'degraded' | 'error' | 'unknown'

export type TopologyRelation = 'owns' | 'selects' | 'routes' | 'mounts' | 'dependsOn'

export interface TopologyNode {
  id: string
  kind: TopologyNodeKind
  name: string
  namespace: string
  status: TopologyHealth
  healthDetail?: string
  labels?: Record<string, string>
  replicasReady?: number
  replicasDesired?: number
  ageTimestamp?: string | null
  ports?: string[]
  protocol?: string
  externalHost?: string
}

export interface TopologyEdge {
  id: string
  source: string
  target: string
  relation: TopologyRelation
  protocol?: string
  ports?: string[]
  rateRps?: number
}

export interface TopologyApplication {
  id: string
  name: string
  namespace: string
  health: TopologyHealth
  replicaSummary: string
  uptimeHint?: string
  errorCount: number
  resourceIds: string[]
}

export interface TopologyGraphRequest {
  clusterId: string
  namespace: string | 'ALL'
}

export interface TopologyGraphResponse {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  applications: TopologyApplication[]
}

export interface TopologyInsight {
  id: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string
  nodeIds?: string[]
}
