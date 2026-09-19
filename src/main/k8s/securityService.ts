import type { V1Container, V1Pod, V1Service } from '@kubernetes/client-node'
import type {
  SecurityEntryPoint,
  SecurityFlag,
  SecurityNamespaceCount,
  SecurityReport,
  SecurityScanRequest,
  SecuritySeverity,
  SecuritySeverityCount,
  SecuritySource,
  SecurityTypeCount,
  SecurityVector,
  SecurityVulnerability
} from '@shared/types/security'
import { clusterManager } from './clusterManager'

function ageIso(ts?: Date | string | null): string | null {
  if (!ts) return null
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function containerFindings(pod: V1Pod, container: V1Container): SecurityVulnerability[] {
  const ns = pod.metadata?.namespace || 'default'
  const owner =
    pod.metadata?.ownerReferences?.find((o) => o.controller)?.name ||
    pod.metadata?.name ||
    'unknown'
  const kind = pod.metadata?.ownerReferences?.find((o) => o.controller)?.kind || 'Pod'
  const cname = container.name
  const sc = container.securityContext || {}
  const out: SecurityVulnerability[] = []

  function push(
    severity: SecuritySeverity,
    title: string,
    rule: string,
    source: SecuritySource,
    policy: SecurityVulnerability['policy'],
    description: string,
    recommendation: string,
    exploitation: string
  ): void {
    out.push({
      id: `${ns}/${owner}/${cname}/${rule}`,
      severity,
      workload: owner,
      kind,
      title,
      namespace: ns,
      rule,
      source,
      policy,
      description,
      recommendation,
      exploitation
    })
  }

  if (sc.privileged === true) {
    push(
      'Critical',
      'Privileged container',
      'SEC-SC-001',
      'securityContext',
      'Privileged',
      `Container '${cname}' runs privileged: true.`,
      'Remove privileged: true; use capabilities instead',
      'Privileged containers can escape to the host'
    )
  }
  if (sc.allowPrivilegeEscalation !== false) {
    push(
      'High',
      'Allows privilege escalation',
      'SEC-SC-002',
      'securityContext',
      'Restricted',
      `Container '${cname}' allows privilege escalation.`,
      'Set allowPrivilegeEscalation: false',
      'Attackers can use setuid/setgid binary to escalate privileges'
    )
  }
  if (sc.readOnlyRootFilesystem !== true) {
    push(
      'Medium',
      'Writable root filesystem',
      'SEC-SC-004',
      'securityContext',
      'Restricted',
      `Container '${cname}' has a writable root filesystem.`,
      'Set readOnlyRootFilesystem: true',
      'Writable root lets malware persist binaries in the container'
    )
  }
  const runAsNonRoot = sc.runAsNonRoot === true || (pod.spec?.securityContext?.runAsNonRoot === true)
  const runAsUser = sc.runAsUser ?? pod.spec?.securityContext?.runAsUser
  if (!runAsNonRoot && (runAsUser === undefined || runAsUser === 0)) {
    push(
      'High',
      'Container may run as root',
      'SEC-SC-005',
      'securityContext',
      'Restricted',
      `Container '${cname}' may run as root.`,
      'Set runAsNonRoot: true at pod or container level',
      'Root in container expands blast radius on escape'
    )
  }
  const drop = sc.capabilities?.drop ?? []
  if (!drop.map((d) => d.toUpperCase()).includes('ALL')) {
    push(
      'Medium',
      'Does not drop all Linux capabilities',
      'SEC-SC-007',
      'securityContext',
      'Restricted',
      `Container '${cname}' does not drop all Linux capabilities.`,
      "Set securityContext.capabilities.drop: ['ALL']",
      'Default Linux capabilities expose a large attack surface'
    )
  }
  const seccomp = sc.seccompProfile?.type || pod.spec?.securityContext?.seccompProfile?.type
  if (!seccomp) {
    push(
      'Medium',
      'Seccomp profile is not set',
      'SEC-SC-009',
      'securityContext',
      'Restricted',
      `Container '${cname}' has no seccomp profile.`,
      'Set seccompProfile.type: RuntimeDefault',
      'Missing seccomp leaves unused syscalls available'
    )
  }
  return out
}

function podFindings(pod: V1Pod): SecurityVulnerability[] {
  const ns = pod.metadata?.namespace || 'default'
  const owner =
    pod.metadata?.ownerReferences?.find((o) => o.controller)?.name ||
    pod.metadata?.name ||
    'unknown'
  const kind = pod.metadata?.ownerReferences?.find((o) => o.controller)?.kind || 'Pod'
  const out: SecurityVulnerability[] = []
  const sa = pod.spec?.serviceAccountName || 'default'
  if (sa === 'default') {
    out.push({
      id: `${ns}/${owner}/SEC-RBAC-008`,
      severity: 'High',
      workload: owner,
      kind,
      title: 'Uses default service account',
      namespace: ns,
      rule: 'SEC-RBAC-008',
      source: 'rbac',
      policy: 'Restricted',
      description: `Workload '${owner}' uses the default service account.`,
      recommendation:
        'Create a dedicated ServiceAccount and set automountServiceAccountToken: false when unused',
      exploitation: 'Default SA often inherits broader cluster permissions'
    })
  }
  if (pod.spec?.automountServiceAccountToken !== false) {
    out.push({
      id: `${ns}/${owner}/SEC-RBAC-011`,
      severity: 'Medium',
      workload: owner,
      kind,
      title: 'Service account token is mounted',
      namespace: ns,
      rule: 'SEC-RBAC-011',
      source: 'rbac',
      policy: 'Baseline',
      description: `Pod '${pod.metadata?.name}' mounts a service account token.`,
      recommendation: 'Set automountServiceAccountToken: false when the token is unused',
      exploitation: 'Stolen token enables API access from the pod'
    })
  }
  for (const vol of pod.spec?.volumes ?? []) {
    if (vol.hostPath) {
      out.push({
        id: `${ns}/${owner}/SEC-VOL-003-${vol.name}`,
        severity: 'Medium',
        workload: owner,
        kind,
        title: 'HostPath volume mounted',
        namespace: ns,
        rule: 'SEC-VOL-003',
        source: 'volumes',
        policy: 'Baseline',
        description: `Pod '${pod.metadata?.name}' mounts a hostPath volume '${vol.name}'.`,
        recommendation: 'Prefer PVC or emptyDir instead of hostPath',
        exploitation: 'hostPath can expose sensitive host files'
      })
    }
  }
  for (const c of [...(pod.spec?.containers ?? []), ...(pod.spec?.initContainers ?? [])]) {
    out.push(...containerFindings(pod, c))
  }
  return out
}

function serviceEntryPoint(svc: V1Service): SecurityEntryPoint | null {
  const type = svc.spec?.type
  if (type !== 'LoadBalancer' && type !== 'NodePort') return null
  const ports = (svc.spec?.ports ?? [])
    .map((p) => {
      const name = p.name || String(p.port)
      const target = p.targetPort != null ? String(p.targetPort) : String(p.port)
      const node = p.nodePort ? `:${p.nodePort}` : ''
      return `${p.port}${node}:${name}/${p.protocol || 'TCP'}→${target}`
    })
    .join(', ')
  const ingress = svc.status?.loadBalancer?.ingress ?? []
  const pending = type === 'LoadBalancer' && ingress.length === 0
  const selector = svc.spec?.selector
    ? Object.entries(svc.spec.selector)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')
    : undefined
  return {
    name: svc.metadata?.name || 'unknown',
    namespace: svc.metadata?.namespace || 'default',
    type,
    ports: ports || '—',
    age: ageIso(svc.metadata?.creationTimestamp as Date | undefined),
    status: pending ? 'Pending' : 'Active',
    clusterIP: svc.spec?.clusterIP,
    externalIPs: ingress.map((i) => i.ip || i.hostname).filter(Boolean).join(', ') || undefined,
    selector
  }
}

function buildVectors(pods: V1Pod[], services: V1Service[]): SecurityVector[] {
  const vectors: SecurityVector[] = []
  const serviceNames = new Set(
    services.map((s) => `${s.metadata?.namespace}/${s.metadata?.name}`)
  )
  for (const pod of pods) {
    const ns = pod.metadata?.namespace || 'default'
    const from =
      pod.metadata?.ownerReferences?.find((o) => o.controller)?.name ||
      pod.metadata?.name ||
      'pod'
    const fromDetail = pod.metadata?.name || from
    const envBlob = [...(pod.spec?.containers ?? []), ...(pod.spec?.initContainers ?? [])]
      .flatMap((c) => c.env ?? [])
      .map((e) => `${e.name}=${e.value || ''}`)
      .join(' ')
    for (const svc of services) {
      const svcNs = svc.metadata?.namespace || 'default'
      const svcName = svc.metadata?.name || ''
      if (!svcName || (svcNs === ns && svcName === from)) continue
      const key = `${svcNs}/${svcName}`
      if (!serviceNames.has(key)) continue
      const hit =
        envBlob.includes(svcName) ||
        envBlob.includes(`${svcName}.${svcNs}`) ||
        envBlob.includes(`${svcName}.${svcNs}.svc`)
      if (!hit) continue
      vectors.push({
        id: `${ns}/${from}->${svcNs}/${svcName}`,
        from,
        fromDetail,
        to: svcName,
        toDetail: svcName,
        namespace: ns
      })
    }
  }
  // Cap noise
  return vectors.slice(0, 80)
}

export function summarizeSecurityFindings(vulns: SecurityVulnerability[]): {
  score: number
  riskLabel: SecurityReport['riskLabel']
  flags: SecurityFlag[]
  typeCounts: SecurityTypeCount[]
  severityCounts: SecuritySeverityCount[]
  namespaceCounts: SecurityNamespaceCount[]
} {
  const severityCounts: SecuritySeverityCount[] = [
    { level: 'Low', count: vulns.filter((v) => v.severity === 'Low').length },
    { level: 'Medium', count: vulns.filter((v) => v.severity === 'Medium').length },
    { level: 'High', count: vulns.filter((v) => v.severity === 'High').length },
    { level: 'Critical', count: vulns.filter((v) => v.severity === 'Critical').length }
  ]
  const weight =
    severityCounts[3].count * 25 +
    severityCounts[2].count * 8 +
    severityCounts[1].count * 2 +
    severityCounts[0].count
  const score = Math.min(100, weight)
  const riskLabel: SecurityReport['riskLabel'] =
    score >= 80
      ? 'Critical Risk'
      : score >= 50
        ? 'High Risk'
        : score >= 25
          ? 'Medium Risk'
          : score > 0
            ? 'Low Risk'
            : 'Healthy'

  const sources: SecuritySource[] = ['securityContext', 'service', 'podSpec', 'volumes', 'rbac']
  const typeCounts = sources.map((axis) => ({
    axis,
    count: vulns.filter((v) => v.source === axis).length
  }))

  const nsMap = new Map<string, SecurityNamespaceCount>()
  for (const v of vulns) {
    const row = nsMap.get(v.namespace) ?? {
      namespace: v.namespace,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
    if (v.severity === 'Low') row.low++
    else if (v.severity === 'Medium') row.medium++
    else if (v.severity === 'High') row.high++
    else row.critical++
    nsMap.set(v.namespace, row)
  }
  const namespaceCounts = [...nsMap.values()].sort(
    (a, b) => b.critical + b.high + b.medium - (a.critical + a.high + a.medium)
  )

  const flagDefs: Array<{ id: string; label: string; test: (v: SecurityVulnerability) => boolean }> = [
    { id: 'escape-host', label: 'escape-host', test: (v) => v.rule === 'SEC-SC-001' },
    { id: 'privileged-sa', label: 'privileged-sa', test: (v) => v.rule === 'SEC-RBAC-011' && v.severity === 'Critical' },
    { id: 'token-leak', label: 'token-leak', test: (v) => v.rule === 'SEC-RBAC-011' },
    { id: 'read-secrets', label: 'read-secrets', test: (v) => v.source === 'rbac' && v.severity === 'High' },
    { id: 'cluster-escalation', label: 'cluster-escalation', test: (v) => v.rule === 'SEC-SC-002' },
    { id: 'workload-injection', label: 'workload-injection', test: (v) => v.rule === 'SEC-SC-004' },
    { id: 'cloud-access', label: 'cloud-access', test: (v) => v.source === 'service' },
    { id: 'pipeline-entry', label: 'pipeline-entry', test: (v) => v.rule === 'SEC-SC-005' },
    { id: 'data-theft', label: 'data-theft', test: (v) => v.rule === 'SEC-VOL-003' },
    { id: 'exec-bridge', label: 'exec-bridge', test: (v) => v.rule === 'SEC-SC-007' }
  ]
  const flags = flagDefs.filter((f) => vulns.some(f.test)).map(({ id, label }) => ({ id, label }))

  return { score, riskLabel, flags, typeCounts, severityCounts, namespaceCounts }
}

/** Deduplicate by rule+workload+namespace (one finding per workload rule). */
function dedupe(vulns: SecurityVulnerability[]): SecurityVulnerability[] {
  const seen = new Set<string>()
  const out: SecurityVulnerability[] = []
  for (const v of vulns) {
    const key = `${v.namespace}|${v.workload}|${v.rule}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

export async function scanSecurity(req: SecurityScanRequest): Promise<SecurityReport> {
  const clients = clusterManager.require(req.clusterId)
  const [podsRes, servicesRes] = await Promise.all([
    clients.core.listPodForAllNamespaces(),
    clients.core.listServiceForAllNamespaces()
  ])
  const pods = podsRes.items ?? []
  const services = servicesRes.items ?? []

  const vulns = dedupe(pods.flatMap(podFindings))
  const entryPoints = services.map(serviceEntryPoint).filter((e): e is SecurityEntryPoint => !!e)
  const vectors = buildVectors(pods, services)
  const summary = summarizeSecurityFindings(vulns)

  // Surface exposed services as service-source findings when LB/NodePort
  for (const ep of entryPoints) {
    if (ep.type === 'LoadBalancer') {
      vulns.push({
        id: `${ep.namespace}/${ep.name}/SEC-SVC-001`,
        severity: 'Medium',
        workload: ep.name,
        kind: 'Service',
        title: 'Public LoadBalancer entry point',
        namespace: ep.namespace,
        rule: 'SEC-SVC-001',
        source: 'service',
        policy: 'Baseline',
        description: `Service '${ep.name}' is type LoadBalancer.`,
        recommendation: 'Restrict with NetworkPolicy / cloud firewall; prefer Ingress where possible',
        exploitation: 'Internet-facing Service expands the attack surface'
      })
    }
  }

  const finalVulns = dedupe(vulns)
  const finalSummary = summarizeSecurityFindings(finalVulns)

  return {
    clusterId: req.clusterId,
    scannedAt: new Date().toISOString(),
    ...finalSummary,
    flags: finalSummary.flags.length ? finalSummary.flags : summary.flags,
    vulnerabilities: finalVulns,
    entryPoints,
    vectors
  }
}
