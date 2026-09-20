import type {
  V1ClusterRole,
  V1ClusterRoleBinding,
  V1Container,
  V1NetworkPolicy,
  V1Pod,
  V1Service
} from '@kubernetes/client-node'
import type {
  SecurityEntryPoint,
  SecurityFlag,
  SecurityNamespaceCount,
  SecurityReport,
  SecurityScanPhase,
  SecurityScanProgress,
  SecurityScanRequest,
  SecurityScanSeverityLive,
  SecuritySeverity,
  SecuritySource,
  SecurityTypeCount,
  SecuritySeverityCount,
  SecurityVector,
  SecurityVulnerability
} from '@shared/types/security'
import { clusterManager } from './clusterManager'

export type SecurityProgressFn = (progress: Omit<SecurityScanProgress, 'clusterId'>) => void

function emptySeverity(): SecurityScanSeverityLive {
  return { critical: 0, high: 0, medium: 0, low: 0 }
}

function tallySeverity(vulns: SecurityVulnerability[]): SecurityScanSeverityLive {
  const s = emptySeverity()
  for (const v of vulns) {
    if (v.severity === 'Critical') s.critical++
    else if (v.severity === 'High') s.high++
    else if (v.severity === 'Medium') s.medium++
    else s.low++
  }
  return s
}

function emit(
  onProgress: SecurityProgressFn | undefined,
  phase: SecurityScanPhase,
  percent: number,
  vulns: SecurityVulnerability[],
  extra?: { detail?: string; resourceCount?: number }
): void {
  if (!onProgress) return
  onProgress({
    phase,
    percent,
    findingsCount: vulns.length,
    severity: tallySeverity(vulns),
    detail: extra?.detail,
    resourceCount: extra?.resourceCount
  })
}

async function tick(ms = 220): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

/** Ensure a phase is visible long enough for the UI. */
async function hold(startedAt: number, minMs: number): Promise<void> {
  const wait = minMs - (Date.now() - startedAt)
  if (wait > 0) await tick(wait)
}

const DANGEROUS_CAPS = new Set([
  'SYS_ADMIN',
  'NET_ADMIN',
  'SYS_PTRACE',
  'SYS_MODULE',
  'DAC_OVERRIDE',
  'DAC_READ_SEARCH',
  'SYS_RAWIO',
  'SYS_TIME',
  'BPF',
  'PERFMON'
])

const SENSITIVE_HOST_PATHS = ['/', '/etc', '/var/run', '/var/lib', '/proc', '/sys', '/root', '/home']

function ageIso(ts?: Date | string | null): string | null {
  if (!ts) return null
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function workloadMeta(pod: V1Pod): { ns: string; owner: string; kind: string } {
  const ns = pod.metadata?.namespace || 'default'
  const owner =
    pod.metadata?.ownerReferences?.find((o) => o.controller)?.name ||
    pod.metadata?.name ||
    'unknown'
  const kind = pod.metadata?.ownerReferences?.find((o) => o.controller)?.kind || 'Pod'
  return { ns, owner, kind }
}

function pushFinding(
  out: SecurityVulnerability[],
  base: {
    ns: string
    owner: string
    kind: string
    cname?: string
    severity: SecuritySeverity
    title: string
    rule: string
    source: SecuritySource
    policy: SecurityVulnerability['policy']
    description: string
    recommendation: string
    exploitation: string
  }
): void {
  const id = base.cname
    ? `${base.ns}/${base.owner}/${base.cname}/${base.rule}`
    : `${base.ns}/${base.owner}/${base.rule}`
  out.push({
    id,
    severity: base.severity,
    workload: base.owner,
    kind: base.kind,
    title: base.title,
    namespace: base.ns,
    rule: base.rule,
    source: base.source,
    policy: base.policy,
    description: base.description,
    recommendation: base.recommendation,
    exploitation: base.exploitation
  })
}

function containerFindings(pod: V1Pod, container: V1Container): SecurityVulnerability[] {
  const { ns, owner, kind } = workloadMeta(pod)
  const cname = container.name
  const sc = container.securityContext || {}
  const out: SecurityVulnerability[] = []

  const add = (
    severity: SecuritySeverity,
    title: string,
    rule: string,
    source: SecuritySource,
    policy: SecurityVulnerability['policy'],
    description: string,
    recommendation: string,
    exploitation: string
  ): void => {
    pushFinding(out, {
      ns,
      owner,
      kind,
      cname,
      severity,
      title,
      rule,
      source,
      policy,
      description,
      recommendation,
      exploitation
    })
  }

  if (sc.privileged === true) {
    add(
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
    add(
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
  if ((container.ports ?? []).some((p) => p.hostPort != null && p.hostPort > 0)) {
    add(
      'High',
      'Container binds a hostPort',
      'SEC-SC-003',
      'podSpec',
      'Baseline',
      `Container '${cname}' publishes a hostPort.`,
      'Avoid hostPort; use Service / Ingress instead',
      'hostPort pins pods to nodes and widens the host attack surface'
    )
  }
  if (sc.readOnlyRootFilesystem !== true) {
    add(
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
  const runAsNonRoot = sc.runAsNonRoot === true || pod.spec?.securityContext?.runAsNonRoot === true
  const runAsUser = sc.runAsUser ?? pod.spec?.securityContext?.runAsUser
  if (!runAsNonRoot && (runAsUser === undefined || runAsUser === 0)) {
    add(
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
  const addedCaps = (sc.capabilities?.add ?? []).map((c) => c.toUpperCase())
  const dangerous = addedCaps.filter((c) => DANGEROUS_CAPS.has(c))
  if (dangerous.length) {
    add(
      'Critical',
      'Dangerous Linux capabilities added',
      'SEC-SC-006',
      'securityContext',
      'Privileged',
      `Container '${cname}' adds capabilities: ${dangerous.join(', ')}.`,
      'Drop ALL capabilities and add only the minimum required set',
      'Capabilities like SYS_ADMIN / NET_ADMIN enable container escape and host takeover'
    )
  }
  const drop = sc.capabilities?.drop ?? []
  if (!drop.map((d) => d.toUpperCase()).includes('ALL')) {
    add(
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
  if (addedCaps.includes('NET_RAW') || (!drop.map((d) => d.toUpperCase()).includes('ALL') && !drop.map((d) => d.toUpperCase()).includes('NET_RAW'))) {
    // Only flag NET_RAW retention when ALL is not dropped (already covered by 007) — skip duplicate noise
    // except when NET_RAW is explicitly added
    if (addedCaps.includes('NET_RAW')) {
      add(
        'High',
        'NET_RAW capability granted',
        'SEC-SC-014',
        'securityContext',
        'Baseline',
        `Container '${cname}' adds NET_RAW.`,
        'Remove NET_RAW unless packet crafting is required',
        'NET_RAW enables spoofing and some network-based attacks'
      )
    }
  }
  const seccomp = sc.seccompProfile?.type || pod.spec?.securityContext?.seccompProfile?.type
  if (!seccomp) {
    add(
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
  const image = container.image || ''
  if (/:latest$/i.test(image) || (!image.includes(':') && !image.includes('@'))) {
    add(
      'Low',
      'Mutable / latest image tag',
      'SEC-POD-003',
      'podSpec',
      'Baseline',
      `Container '${cname}' uses image '${image || 'unknown'}' without a digest or immutable tag.`,
      'Pin images to a digest (sha256:…) or an immutable version tag',
      'Floating tags can silently introduce vulnerable or malicious layers'
    )
  }
  const limits = container.resources?.limits
  if (!limits?.cpu || !limits?.memory) {
    add(
      'Low',
      'Missing CPU/memory limits',
      'SEC-POD-001',
      'podSpec',
      'Baseline',
      `Container '${cname}' has no complete resource limits.`,
      'Set resources.limits.cpu and resources.limits.memory',
      'Unlimited containers can starve the node (noisy neighbor / DoS)'
    )
  }
  return out
}

function podFindings(pod: V1Pod): SecurityVulnerability[] {
  const { ns, owner, kind } = workloadMeta(pod)
  const out: SecurityVulnerability[] = []
  const sa = pod.spec?.serviceAccountName || 'default'

  if (sa === 'default') {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'High',
      title: 'Uses default service account',
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
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'Medium',
      title: 'Service account token is mounted',
      rule: 'SEC-RBAC-011',
      source: 'rbac',
      policy: 'Baseline',
      description: `Pod '${pod.metadata?.name}' mounts a service account token.`,
      recommendation: 'Set automountServiceAccountToken: false when the token is unused',
      exploitation: 'Stolen token enables API access from the pod'
    })
  }
  if (pod.spec?.hostNetwork === true) {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'Critical',
      title: 'Pod uses hostNetwork',
      rule: 'SEC-SC-008',
      source: 'podSpec',
      policy: 'Privileged',
      description: `Pod '${pod.metadata?.name}' sets hostNetwork: true.`,
      recommendation: 'Disable hostNetwork unless the workload must bind host interfaces',
      exploitation: 'hostNetwork bypasses NetworkPolicy and shares the host network stack'
    })
  }
  if (pod.spec?.hostPID === true) {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'Critical',
      title: 'Pod uses hostPID',
      rule: 'SEC-SC-010',
      source: 'podSpec',
      policy: 'Privileged',
      description: `Pod '${pod.metadata?.name}' sets hostPID: true.`,
      recommendation: 'Disable hostPID; it is rarely required outside node agents',
      exploitation: 'Seeing host PIDs enables process injection and secret scraping'
    })
  }
  if (pod.spec?.hostIPC === true) {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'High',
      title: 'Pod uses hostIPC',
      rule: 'SEC-SC-011',
      source: 'podSpec',
      policy: 'Privileged',
      description: `Pod '${pod.metadata?.name}' sets hostIPC: true.`,
      recommendation: 'Disable hostIPC unless shared IPC with the host is required',
      exploitation: 'Shared IPC namespaces can leak data across isolation boundaries'
    })
  }
  if (pod.spec?.shareProcessNamespace === true) {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'Medium',
      title: 'Shared process namespace',
      rule: 'SEC-SC-012',
      source: 'podSpec',
      policy: 'Baseline',
      description: `Pod '${pod.metadata?.name}' shares a process namespace across containers.`,
      recommendation: 'Disable shareProcessNamespace unless sidecars must debug each other',
      exploitation: 'One compromised container can inspect or signal sibling processes'
    })
  }

  const annotations = pod.metadata?.annotations ?? {}
  const apparmor =
    annotations['container.apparmor.security.beta.kubernetes.io'] ||
    Object.entries(annotations).find(([k]) => k.startsWith('container.apparmor.security'))?.[1]
  if (typeof apparmor === 'string' && /unconfined/i.test(apparmor)) {
    pushFinding(out, {
      ns,
      owner,
      kind,
      severity: 'High',
      title: 'AppArmor profile is unconfined',
      rule: 'SEC-SC-013',
      source: 'securityContext',
      policy: 'Baseline',
      description: `Pod '${pod.metadata?.name}' sets AppArmor to unconfined.`,
      recommendation: 'Use a runtime/default AppArmor profile instead of unconfined',
      exploitation: 'Unconfined AppArmor removes LSM confinement for the workload'
    })
  }

  for (const vol of pod.spec?.volumes ?? []) {
    if (!vol.hostPath?.path) continue
    const path = vol.hostPath.path
    const lower = path.toLowerCase()
    if (lower.includes('docker.sock') || lower.includes('containerd.sock') || lower.includes('crio.sock')) {
      pushFinding(out, {
        ns,
        owner,
        kind,
        severity: 'Critical',
        title: 'Container runtime socket mounted',
        rule: 'SEC-VOL-001',
        source: 'volumes',
        policy: 'Privileged',
        description: `Pod '${pod.metadata?.name}' mounts runtime socket via hostPath '${path}'.`,
        recommendation: 'Never mount docker/containerd sockets into application pods',
        exploitation: 'Runtime socket access equals root on the node'
      })
      continue
    }
    const sensitive = SENSITIVE_HOST_PATHS.some(
      (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}\\`)
    )
    if (sensitive) {
      pushFinding(out, {
        ns,
        owner,
        kind,
        severity: 'High',
        title: 'Sensitive hostPath mounted',
        rule: 'SEC-VOL-002',
        source: 'volumes',
        policy: 'Baseline',
        description: `Pod '${pod.metadata?.name}' mounts sensitive hostPath '${path}'.`,
        recommendation: 'Prefer PVC/CSI volumes; avoid mounting host OS paths',
        exploitation: 'Host OS paths can leak credentials or enable escape'
      })
    } else {
      pushFinding(out, {
        ns,
        owner,
        kind,
        severity: 'Medium',
        title: 'HostPath volume mounted',
        rule: 'SEC-VOL-003',
        source: 'volumes',
        policy: 'Baseline',
        description: `Pod '${pod.metadata?.name}' mounts a hostPath volume '${vol.name}' (${path}).`,
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

function serviceFindings(svc: V1Service): SecurityVulnerability[] {
  const out: SecurityVulnerability[] = []
  const name = svc.metadata?.name || 'unknown'
  const ns = svc.metadata?.namespace || 'default'
  const type = svc.spec?.type

  if (type === 'LoadBalancer') {
    pushFinding(out, {
      ns,
      owner: name,
      kind: 'Service',
      severity: 'Medium',
      title: 'Public LoadBalancer entry point',
      rule: 'SEC-SVC-001',
      source: 'service',
      policy: 'Baseline',
      description: `Service '${name}' is type LoadBalancer.`,
      recommendation: 'Restrict with NetworkPolicy / cloud firewall; prefer Ingress where possible',
      exploitation: 'Internet-facing Service expands the attack surface'
    })
  }
  if (type === 'NodePort') {
    pushFinding(out, {
      ns,
      owner: name,
      kind: 'Service',
      severity: 'Medium',
      title: 'NodePort service exposure',
      rule: 'SEC-SVC-002',
      source: 'service',
      policy: 'Baseline',
      description: `Service '${name}' is type NodePort.`,
      recommendation: 'Prefer ClusterIP + Ingress; lock down node firewalls if NodePort is required',
      exploitation: 'NodePorts are reachable on every node IP and often scanned'
    })
  }
  if ((svc.spec?.externalIPs ?? []).length > 0) {
    pushFinding(out, {
      ns,
      owner: name,
      kind: 'Service',
      severity: 'High',
      title: 'Service uses externalIPs',
      rule: 'SEC-SVC-003',
      source: 'service',
      policy: 'Baseline',
      description: `Service '${name}' sets externalIPs: ${(svc.spec?.externalIPs ?? []).join(', ')}.`,
      recommendation: 'Avoid externalIPs; use LoadBalancer/Ingress with proper controls',
      exploitation: 'Mis-set externalIPs can hijack traffic (CVE-class risk historically)'
    })
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

function networkFindings(
  pods: V1Pod[],
  policies: V1NetworkPolicy[]
): SecurityVulnerability[] {
  const out: SecurityVulnerability[] = []
  const coveredNs = new Set(
    policies.map((p) => p.metadata?.namespace).filter((n): n is string => !!n)
  )
  const podNamespaces = new Set(
    pods.map((p) => p.metadata?.namespace || 'default').filter((n) => n !== 'kube-system' && n !== 'kube-public')
  )
  for (const ns of podNamespaces) {
    if (coveredNs.has(ns)) continue
    // One finding per unprotected namespace (not per pod)
    pushFinding(out, {
      ns,
      owner: ns,
      kind: 'Namespace',
      severity: 'Medium',
      title: 'Namespace has no NetworkPolicy',
      rule: 'SEC-NET-001',
      source: 'network',
      policy: 'Baseline',
      description: `Namespace '${ns}' has workloads but no NetworkPolicy objects.`,
      recommendation: 'Add default-deny NetworkPolicies and allow only required traffic',
      exploitation: 'Without NetworkPolicy, any pod can talk to any pod in the cluster CNI'
    })
  }
  return out
}

function roleIsWildcard(role: V1ClusterRole): boolean {
  for (const rule of role.rules ?? []) {
    const verbs = (rule.verbs ?? []).map((v) => v.toLowerCase())
    const resources = (rule.resources ?? []).map((r) => r.toLowerCase())
    const apiGroups = (rule.apiGroups ?? []).map((g) => g.toLowerCase())
    if (verbs.includes('*') || resources.includes('*') || apiGroups.includes('*')) return true
  }
  return false
}

function roleIsClusterAdmin(role: V1ClusterRole): boolean {
  const name = role.metadata?.name || ''
  if (name === 'cluster-admin') return true
  return roleIsWildcard(role)
}

function rbacFindings(
  roles: V1ClusterRole[],
  bindings: V1ClusterRoleBinding[]
): SecurityVulnerability[] {
  const out: SecurityVulnerability[] = []
  const roleByName = new Map(roles.map((r) => [r.metadata?.name || '', r]))

  for (const role of roles) {
    const name = role.metadata?.name || 'unknown'
    if (name.startsWith('system:')) continue
    if (!roleIsWildcard(role)) continue
    pushFinding(out, {
      ns: 'cluster-scope',
      owner: name,
      kind: 'ClusterRole',
      severity: 'High',
      title: 'ClusterRole uses wildcard permissions',
      rule: 'SEC-RBAC-014',
      source: 'rbac',
      policy: 'Restricted',
      description: `ClusterRole '${name}' grants wildcard apiGroups/resources/verbs.`,
      recommendation: 'Replace wildcards with least-privilege verbs and resources',
      exploitation: 'Wildcard RBAC is a lateral-movement shortcut'
    })
  }

  for (const binding of bindings) {
    const bName = binding.metadata?.name || 'unknown'
    const roleRef = binding.roleRef?.name || ''
    const role = roleByName.get(roleRef)
    const subjects = binding.subjects ?? []
    for (const sub of subjects) {
      const subName = sub.name || 'unknown'
      if (
        (sub.kind === 'User' || sub.kind === 'Group') &&
        (subName === 'system:anonymous' || subName === 'system:unauthenticated')
      ) {
        pushFinding(out, {
          ns: 'cluster-scope',
          owner: bName,
          kind: 'ClusterRoleBinding',
          severity: 'Critical',
          title: 'Anonymous / unauthenticated cluster binding',
          rule: 'SEC-RBAC-015',
          source: 'rbac',
          policy: 'Privileged',
          description: `ClusterRoleBinding '${bName}' binds '${roleRef}' to ${sub.kind}/${subName}.`,
          recommendation: 'Remove anonymous bindings; require authenticated identities',
          exploitation: 'Unauthenticated callers may reach cluster APIs'
        })
      }
      if (
        sub.kind === 'ServiceAccount' &&
        role &&
        roleIsClusterAdmin(role) &&
        !roleRef.startsWith('system:')
      ) {
        const ns = sub.namespace || 'default'
        pushFinding(out, {
          ns,
          owner: subName,
          kind: 'ServiceAccount',
          severity: 'Critical',
          title: 'ServiceAccount has cluster-admin class rights',
          rule: 'SEC-RBAC-016',
          source: 'rbac',
          policy: 'Privileged',
          description: `ServiceAccount '${ns}/${subName}' is bound to ClusterRole '${roleRef}' via '${bName}'.`,
          recommendation: 'Scope the SA to a Role with least privilege; avoid cluster-admin',
          exploitation: 'Stolen SA token enables full cluster takeover'
        })
      }
    }
  }
  return out
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

  const sources: SecuritySource[] = [
    'securityContext',
    'service',
    'podSpec',
    'volumes',
    'rbac',
    'network'
  ]
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

  const flagDefs: Array<{ id: string; label: string; test: (v: SecurityVulnerability) => boolean }> =
    [
      { id: 'escape-host', label: 'escape-host', test: (v) => v.rule === 'SEC-SC-001' || v.rule === 'SEC-VOL-001' },
      { id: 'host-network', label: 'host-network', test: (v) => v.rule === 'SEC-SC-008' },
      { id: 'host-pid', label: 'host-pid', test: (v) => v.rule === 'SEC-SC-010' },
      { id: 'token-leak', label: 'token-leak', test: (v) => v.rule === 'SEC-RBAC-011' },
      { id: 'read-secrets', label: 'read-secrets', test: (v) => v.source === 'rbac' && v.severity === 'High' },
      { id: 'cluster-admin', label: 'cluster-admin', test: (v) => v.rule === 'SEC-RBAC-016' },
      { id: 'anon-access', label: 'anon-access', test: (v) => v.rule === 'SEC-RBAC-015' },
      { id: 'cluster-escalation', label: 'cluster-escalation', test: (v) => v.rule === 'SEC-SC-002' },
      { id: 'dangerous-caps', label: 'dangerous-caps', test: (v) => v.rule === 'SEC-SC-006' },
      { id: 'cloud-access', label: 'cloud-access', test: (v) => v.source === 'service' },
      { id: 'no-network-policy', label: 'no-network-policy', test: (v) => v.rule === 'SEC-NET-001' },
      { id: 'data-theft', label: 'data-theft', test: (v) => v.rule === 'SEC-VOL-002' || v.rule === 'SEC-VOL-003' }
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

export async function buildSecurityReport(
  clusterId: string,
  input: {
    pods: V1Pod[]
    services: V1Service[]
    policies: V1NetworkPolicy[]
    roles: V1ClusterRole[]
    bindings: V1ClusterRoleBinding[]
  },
  onProgress?: SecurityProgressFn,
  opts?: { resourcesReady?: boolean }
): Promise<SecurityReport> {
  const { pods, services, policies, roles, bindings } = input
  const vulns: SecurityVulnerability[] = []
  const ready = opts?.resourcesReady === true

  if (!ready) {
    let t0 = Date.now()
    emit(onProgress, 'starting', 2, vulns)
    await hold(t0, 500)

    t0 = Date.now()
    emit(onProgress, 'fetch-pods', 10, vulns, {
      detail: `${pods.length} pods`,
      resourceCount: pods.length
    })
    await hold(t0, 600)

    t0 = Date.now()
    emit(onProgress, 'fetch-services', 20, vulns, {
      detail: `${services.length} services`,
      resourceCount: services.length
    })
    await hold(t0, 550)

    t0 = Date.now()
    emit(onProgress, 'fetch-network', 30, vulns, {
      detail: `${policies.length} network policies`,
      resourceCount: policies.length
    })
    await hold(t0, 550)

    t0 = Date.now()
    emit(onProgress, 'fetch-rbac', 40, vulns, {
      detail: `${roles.length} roles · ${bindings.length} bindings`,
      resourceCount: roles.length + bindings.length
    })
    await hold(t0, 600)
  } else {
    await tick(400)
  }

  emit(onProgress, 'analyze-pods', 48, vulns, { resourceCount: pods.length })
  const batches = Math.min(14, Math.max(8, Math.ceil(Math.max(pods.length, 1) / 2)))
  const batch = Math.max(1, Math.ceil(Math.max(pods.length, 1) / batches))
  if (pods.length === 0) await tick(450)
  for (let i = 0; i < pods.length; i += batch) {
    const slice = pods.slice(i, i + batch)
    vulns.push(...slice.flatMap(podFindings))
    const progressed = Math.min(68, 48 + Math.round(((i + slice.length) / Math.max(pods.length, 1)) * 20))
    emit(onProgress, 'analyze-pods', progressed, vulns, {
      detail: `${Math.min(i + slice.length, pods.length)} / ${pods.length} pods`,
      resourceCount: pods.length
    })
    await tick(320)
  }

  let t0 = Date.now()
  emit(onProgress, 'analyze-services', 72, vulns, { resourceCount: services.length })
  vulns.push(...services.flatMap(serviceFindings))
  emit(onProgress, 'analyze-services', 78, vulns, {
    detail: `${services.length} services`,
    resourceCount: services.length
  })
  await hold(t0, 650)

  t0 = Date.now()
  emit(onProgress, 'analyze-network', 82, vulns)
  vulns.push(...networkFindings(pods, policies))
  emit(onProgress, 'analyze-network', 86, vulns, {
    detail: `${policies.length} policies`,
    resourceCount: policies.length
  })
  await hold(t0, 600)

  t0 = Date.now()
  emit(onProgress, 'analyze-rbac', 88, vulns)
  vulns.push(...rbacFindings(roles, bindings))
  emit(onProgress, 'analyze-rbac', 92, vulns, {
    detail: `${roles.length + bindings.length} RBAC objects`,
    resourceCount: roles.length + bindings.length
  })
  await hold(t0, 650)

  const deduped = dedupe(vulns)
  t0 = Date.now()
  emit(onProgress, 'analyze-vectors', 94, deduped)
  const entryPoints = services.map(serviceEntryPoint).filter((e): e is SecurityEntryPoint => !!e)
  const vectors = buildVectors(pods, services)
  emit(onProgress, 'analyze-vectors', 96, deduped, {
    detail: `${entryPoints.length} entry points · ${vectors.length} vectors`
  })
  await hold(t0, 600)

  t0 = Date.now()
  emit(onProgress, 'summarize', 98, deduped)
  const finalSummary = summarizeSecurityFindings(deduped)
  await hold(t0, 500)
  emit(onProgress, 'done', 100, deduped)

  return {
    clusterId,
    scannedAt: new Date().toISOString(),
    ...finalSummary,
    vulnerabilities: deduped,
    entryPoints,
    vectors
  }
}

export async function scanSecurity(
  req: SecurityScanRequest,
  onProgress?: SecurityProgressFn
): Promise<SecurityReport> {
  const clients = clusterManager.require(req.clusterId)
  const empty: SecurityVulnerability[] = []

  let t0 = Date.now()
  emit(onProgress, 'starting', 2, empty)
  await hold(t0, 450)

  t0 = Date.now()
  emit(onProgress, 'fetch-pods', 6, empty)
  const podsRes = await clients.core.listPodForAllNamespaces()
  const pods = podsRes.items ?? []
  emit(onProgress, 'fetch-pods', 14, empty, {
    detail: `${pods.length} pods`,
    resourceCount: pods.length
  })
  await hold(t0, 550)

  t0 = Date.now()
  emit(onProgress, 'fetch-services', 16, empty)
  const servicesRes = await clients.core.listServiceForAllNamespaces()
  const services = servicesRes.items ?? []
  emit(onProgress, 'fetch-services', 24, empty, {
    detail: `${services.length} services`,
    resourceCount: services.length
  })
  await hold(t0, 500)

  t0 = Date.now()
  emit(onProgress, 'fetch-network', 26, empty)
  const npRes = await clients.networking
    .listNetworkPolicyForAllNamespaces()
    .catch(() => ({ items: [] as V1NetworkPolicy[] }))
  const policies = npRes.items ?? []
  emit(onProgress, 'fetch-network', 34, empty, {
    detail: `${policies.length} network policies`,
    resourceCount: policies.length
  })
  await hold(t0, 500)

  t0 = Date.now()
  emit(onProgress, 'fetch-rbac', 36, empty)
  const [rolesRes, bindingsRes] = await Promise.all([
    clients.rbac.listClusterRole().catch(() => ({ items: [] as V1ClusterRole[] })),
    clients.rbac.listClusterRoleBinding().catch(() => ({ items: [] as V1ClusterRoleBinding[] }))
  ])
  const roles = rolesRes.items ?? []
  const bindings = bindingsRes.items ?? []
  emit(onProgress, 'fetch-rbac', 44, empty, {
    detail: `${roles.length} roles · ${bindings.length} bindings`,
    resourceCount: roles.length + bindings.length
  })
  await hold(t0, 500)

  return buildSecurityReport(
    req.clusterId,
    { pods, services, policies, roles, bindings },
    onProgress,
    { resourcesReady: true }
  )
}
