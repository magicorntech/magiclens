export type SecuritySeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type SecuritySource =
  | 'securityContext'
  | 'rbac'
  | 'podSpec'
  | 'volumes'
  | 'service'
  | 'network'

export type SecurityPolicy = 'Restricted' | 'Baseline' | 'Privileged'

export type SecurityScanPhase =
  | 'starting'
  | 'fetch-pods'
  | 'fetch-services'
  | 'fetch-network'
  | 'fetch-rbac'
  | 'analyze-pods'
  | 'analyze-services'
  | 'analyze-network'
  | 'analyze-rbac'
  | 'analyze-vectors'
  | 'summarize'
  | 'done'

export interface SecurityScanSeverityLive {
  critical: number
  high: number
  medium: number
  low: number
}

export interface SecurityScanProgress {
  clusterId: string
  phase: SecurityScanPhase
  /** Optional detail e.g. "142 pods" */
  detail?: string
  resourceCount?: number
  findingsCount: number
  severity: SecurityScanSeverityLive
  percent: number
}

export interface SecurityHistorySummary {
  id: string
  clusterId: string
  scannedAt: string
  /** User-editable label */
  name: string
  score: number
  riskLabel: SecurityReport['riskLabel']
  findingCount: number
  critical: number
  high: number
  medium: number
  low: number
  entryPointCount: number
  vectorCount: number
  flags: SecurityFlag[]
}

export interface SecurityHistoryRecord extends SecurityHistorySummary {
  report: SecurityReport
}

export interface SecurityHistoryListRequest {
  clusterId: string
}

export interface SecurityHistoryGetRequest {
  clusterId: string
  id: string
}

export interface SecurityHistoryDeleteRequest {
  clusterId: string
  id: string
}

export interface SecurityHistoryRenameRequest {
  clusterId: string
  id: string
  name: string
}

export interface SecurityFlag {
  id: string
  label: string
}

export interface SecurityVulnerability {
  id: string
  severity: SecuritySeverity
  workload: string
  kind: string
  title: string
  namespace: string
  rule: string
  source: SecuritySource
  policy: SecurityPolicy
  description: string
  recommendation: string
  exploitation: string
}

export interface SecurityEntryPoint {
  name: string
  namespace: string
  type: 'LoadBalancer' | 'NodePort'
  ports: string
  age: string | null
  status: 'Active' | 'Pending'
  clusterIP?: string
  externalIPs?: string
  selector?: string
}

export interface SecurityVector {
  id: string
  from: string
  fromDetail: string
  to: string
  toDetail: string
  namespace: string
}

export interface SecurityTypeCount {
  axis: SecuritySource
  count: number
}

export interface SecuritySeverityCount {
  level: SecuritySeverity
  count: number
}

export interface SecurityNamespaceCount {
  namespace: string
  low: number
  medium: number
  high: number
  critical: number
}

export interface SecurityReport {
  clusterId: string
  scannedAt: string
  score: number
  riskLabel: 'Critical Risk' | 'High Risk' | 'Medium Risk' | 'Low Risk' | 'Healthy'
  flags: SecurityFlag[]
  typeCounts: SecurityTypeCount[]
  severityCounts: SecuritySeverityCount[]
  namespaceCounts: SecurityNamespaceCount[]
  vulnerabilities: SecurityVulnerability[]
  entryPoints: SecurityEntryPoint[]
  vectors: SecurityVector[]
}

export interface SecurityScanRequest {
  clusterId: string
}
