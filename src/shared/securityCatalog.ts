import type { SecurityPolicy, SecuritySeverity, SecuritySource } from './types/security'

export interface SecurityRuleBookEntry {
  id: string
  title: string
  severity: SecuritySeverity
  source: SecuritySource
  policy: SecurityPolicy
  /** Short one-liner */
  summary: string
  /** What the check looks for */
  what: string
  /** Why it matters */
  why: string
  /** Typical remediation */
  fix: string
  /** How it can be abused */
  exploit: string
  /** Related Kubernetes fields / docs keywords */
  refs: string[]
}

/** Canonical rule book for MagicLens security findings (SEC-*). */
export const SECURITY_RULE_BOOK: SecurityRuleBookEntry[] = [
  {
    id: 'SEC-SC-001',
    title: 'Privileged container',
    severity: 'Critical',
    source: 'securityContext',
    policy: 'Privileged',
    summary: 'Container runs with privileged: true.',
    what: 'Detects containers where securityContext.privileged is true.',
    why: 'Privileged mode grants nearly all host capabilities and breaks Pod Security Restricted.',
    fix: 'Remove privileged: true. Prefer specific Linux capabilities or a device plugin.',
    exploit: 'Attackers can escape the container and control the node.',
    refs: ['securityContext.privileged', 'Pod Security Standards']
  },
  {
    id: 'SEC-SC-002',
    title: 'Allows privilege escalation',
    severity: 'High',
    source: 'securityContext',
    policy: 'Restricted',
    summary: 'allowPrivilegeEscalation is not false.',
    what: 'Flags containers that omit allowPrivilegeEscalation: false.',
    why: 'Without this, a process can gain more privileges than its parent (setuid).',
    fix: 'Set securityContext.allowPrivilegeEscalation: false on every container.',
    exploit: 'setuid/setgid binaries can escalate to root inside the container.',
    refs: ['securityContext.allowPrivilegeEscalation']
  },
  {
    id: 'SEC-SC-003',
    title: 'Container binds a hostPort',
    severity: 'High',
    source: 'podSpec',
    policy: 'Baseline',
    summary: 'A container port sets hostPort.',
    what: 'Detects container ports with hostPort > 0.',
    why: 'hostPort couples scheduling to nodes and opens host-level listeners.',
    fix: 'Use a Service or Ingress instead of hostPort.',
    exploit: 'Host listeners are reachable beyond the pod network and harder to policy.',
    refs: ['containers.ports.hostPort']
  },
  {
    id: 'SEC-SC-004',
    title: 'Writable root filesystem',
    severity: 'Medium',
    source: 'securityContext',
    policy: 'Restricted',
    summary: 'readOnlyRootFilesystem is not true.',
    what: 'Requires readOnlyRootFilesystem: true for containers.',
    why: 'A writable root lets malware drop binaries and persist across restarts.',
    fix: 'Set readOnlyRootFilesystem: true and mount emptyDir/tmp volumes for writable paths.',
    exploit: 'Malware can write to /usr/bin or app paths inside the container.',
    refs: ['securityContext.readOnlyRootFilesystem']
  },
  {
    id: 'SEC-SC-005',
    title: 'Container may run as root',
    severity: 'High',
    source: 'securityContext',
    policy: 'Restricted',
    summary: 'runAsNonRoot / runAsUser do not force a non-root UID.',
    what: 'Checks that the pod or container forces a non-root user.',
    why: 'Root in the container widens impact if the process is compromised.',
    fix: 'Set runAsNonRoot: true and preferably runAsUser to a non-zero UID.',
    exploit: 'Compromised root processes can abuse mounted secrets and hostPath more easily.',
    refs: ['securityContext.runAsNonRoot', 'securityContext.runAsUser']
  },
  {
    id: 'SEC-SC-006',
    title: 'Dangerous Linux capabilities added',
    severity: 'Critical',
    source: 'securityContext',
    policy: 'Privileged',
    summary: 'Adds SYS_ADMIN, NET_ADMIN, or similar high-risk caps.',
    what: 'Flags capabilities.add entries in a dangerous set (SYS_ADMIN, NET_ADMIN, BPF, …).',
    why: 'These caps approach privileged mode and weaken container isolation.',
    fix: 'Drop ALL, then add only the minimum required capabilities.',
    exploit: 'SYS_ADMIN / NET_ADMIN are common container-escape building blocks.',
    refs: ['securityContext.capabilities.add']
  },
  {
    id: 'SEC-SC-007',
    title: 'Does not drop all Linux capabilities',
    severity: 'Medium',
    source: 'securityContext',
    policy: 'Restricted',
    summary: 'capabilities.drop does not include ALL.',
    what: 'Expects capabilities.drop: ["ALL"] (then add only what is needed).',
    why: 'Default capability sets leave many unused privileges available to attackers.',
    fix: "Set capabilities.drop: ['ALL'] and add back only required caps under add.",
    exploit: 'Unused capabilities enlarge the kernel attack surface from the container.',
    refs: ['securityContext.capabilities']
  },
  {
    id: 'SEC-SC-008',
    title: 'Pod uses hostNetwork',
    severity: 'Critical',
    source: 'podSpec',
    policy: 'Privileged',
    summary: 'spec.hostNetwork is true.',
    what: 'Detects pods that share the host network namespace.',
    why: 'hostNetwork bypasses pod NetworkPolicies and exposes host interfaces.',
    fix: 'Disable hostNetwork unless the workload is a node-level agent that requires it.',
    exploit: 'Compromised pods can sniff or bind host network traffic.',
    refs: ['spec.hostNetwork']
  },
  {
    id: 'SEC-SC-009',
    title: 'Seccomp profile is not set',
    severity: 'Medium',
    source: 'securityContext',
    policy: 'Restricted',
    summary: 'No seccompProfile is configured.',
    what: 'Looks for seccompProfile.type (RuntimeDefault or Localhost).',
    why: 'Seccomp filters dangerous syscalls that most apps never need.',
    fix: 'Set seccompProfile.type: RuntimeDefault at pod or container level.',
    exploit: 'Rare syscalls stay available for kernel exploits.',
    refs: ['securityContext.seccompProfile']
  },
  {
    id: 'SEC-SC-010',
    title: 'Pod uses hostPID',
    severity: 'Critical',
    source: 'podSpec',
    policy: 'Privileged',
    summary: 'spec.hostPID is true.',
    what: 'Detects pods that share the host PID namespace.',
    why: 'Seeing host processes enables injection and credential scraping.',
    fix: 'Disable hostPID for application workloads.',
    exploit: 'Attackers can signal or inspect host processes from the pod.',
    refs: ['spec.hostPID']
  },
  {
    id: 'SEC-SC-011',
    title: 'Pod uses hostIPC',
    severity: 'High',
    source: 'podSpec',
    policy: 'Privileged',
    summary: 'spec.hostIPC is true.',
    what: 'Detects pods that share the host IPC namespace.',
    why: 'Shared IPC can leak data across isolation boundaries.',
    fix: 'Disable hostIPC unless shared memory with the host is required.',
    exploit: 'IPC objects on the host become reachable from the container.',
    refs: ['spec.hostIPC']
  },
  {
    id: 'SEC-SC-012',
    title: 'Shared process namespace',
    severity: 'Medium',
    source: 'podSpec',
    policy: 'Baseline',
    summary: 'shareProcessNamespace is true.',
    what: 'Detects pods where containers share one PID namespace.',
    why: 'A compromised container can inspect sibling processes.',
    fix: 'Disable shareProcessNamespace unless sidecars must debug each other.',
    exploit: 'Sibling containers can dump memory or send signals to peers.',
    refs: ['spec.shareProcessNamespace']
  },
  {
    id: 'SEC-SC-013',
    title: 'AppArmor profile is unconfined',
    severity: 'High',
    source: 'securityContext',
    policy: 'Baseline',
    summary: 'AppArmor annotation is unconfined.',
    what: 'Flags container.apparmor… annotations set to unconfined.',
    why: 'Unconfined removes LSM confinement for the workload.',
    fix: 'Use runtime/default or a custom confined profile.',
    exploit: 'Without AppArmor, more kernel interfaces stay reachable.',
    refs: ['container.apparmor.security.beta.kubernetes.io']
  },
  {
    id: 'SEC-SC-014',
    title: 'NET_RAW capability granted',
    severity: 'High',
    source: 'securityContext',
    policy: 'Baseline',
    summary: 'capabilities.add includes NET_RAW.',
    what: 'Detects explicit NET_RAW capability grants.',
    why: 'NET_RAW enables packet crafting and some spoofing attacks.',
    fix: 'Remove NET_RAW unless the app must craft raw packets.',
    exploit: 'Attackers can forge packets from inside the cluster network.',
    refs: ['securityContext.capabilities.add']
  },
  {
    id: 'SEC-RBAC-008',
    title: 'Uses default service account',
    severity: 'High',
    source: 'rbac',
    policy: 'Restricted',
    summary: 'Pod uses the namespace default ServiceAccount.',
    what: 'Flags workloads still bound to serviceAccountName: default.',
    why: 'Default SAs often accumulate broad RoleBindings over time.',
    fix: 'Create a dedicated ServiceAccount per workload and bind only needed roles.',
    exploit: 'Stolen default SA tokens may have more API rights than expected.',
    refs: ['spec.serviceAccountName']
  },
  {
    id: 'SEC-RBAC-011',
    title: 'Service account token is mounted',
    severity: 'Medium',
    source: 'rbac',
    policy: 'Baseline',
    summary: 'automountServiceAccountToken is not false.',
    what: 'Detects pods that still auto-mount the projected SA token.',
    why: 'Many apps never call the API; mounting the token is unnecessary risk.',
    fix: 'Set automountServiceAccountToken: false when the token is unused.',
    exploit: 'Token theft from the filesystem enables API access as that SA.',
    refs: ['spec.automountServiceAccountToken']
  },
  {
    id: 'SEC-RBAC-014',
    title: 'ClusterRole uses wildcard permissions',
    severity: 'High',
    source: 'rbac',
    policy: 'Restricted',
    summary: 'ClusterRole grants * on apiGroups/resources/verbs.',
    what: 'Scans ClusterRoles (non-system) for wildcard rules.',
    why: 'Wildcards violate least privilege and amplify token theft.',
    fix: 'Enumerate exact verbs and resources needed by the workload.',
    exploit: 'Wildcard RBAC is a lateral-movement shortcut.',
    refs: ['ClusterRole.rules']
  },
  {
    id: 'SEC-RBAC-015',
    title: 'Anonymous / unauthenticated cluster binding',
    severity: 'Critical',
    source: 'rbac',
    policy: 'Privileged',
    summary: 'ClusterRoleBinding targets system:anonymous or unauthenticated.',
    what: 'Finds ClusterRoleBindings to anonymous/unauthenticated subjects.',
    why: 'Unauthenticated callers should not hold cluster roles.',
    fix: 'Remove those bindings; require authenticated identities.',
    exploit: 'Anyone who reaches the API may exercise those permissions.',
    refs: ['ClusterRoleBinding.subjects']
  },
  {
    id: 'SEC-RBAC-016',
    title: 'ServiceAccount has cluster-admin class rights',
    severity: 'Critical',
    source: 'rbac',
    policy: 'Privileged',
    summary: 'SA bound to cluster-admin or wildcard ClusterRole.',
    what: 'Flags ServiceAccounts bound to cluster-admin-class ClusterRoles.',
    why: 'A stolen SA token then equals full cluster control.',
    fix: 'Bind a narrow Role/RoleBinding scoped to the namespace.',
    exploit: 'Token theft becomes a full cluster takeover path.',
    refs: ['ClusterRoleBinding', 'cluster-admin']
  },
  {
    id: 'SEC-VOL-001',
    title: 'Container runtime socket mounted',
    severity: 'Critical',
    source: 'volumes',
    policy: 'Privileged',
    summary: 'hostPath mounts docker/containerd/crio.sock.',
    what: 'Detects hostPath volumes pointing at container runtime sockets.',
    why: 'Socket access is equivalent to root on the node.',
    fix: 'Never mount runtime sockets into application pods.',
    exploit: 'Attackers can start privileged containers on the host.',
    refs: ['volumes.hostPath', 'docker.sock']
  },
  {
    id: 'SEC-VOL-002',
    title: 'Sensitive hostPath mounted',
    severity: 'High',
    source: 'volumes',
    policy: 'Baseline',
    summary: 'hostPath mounts /, /etc, /var/run, or similar OS paths.',
    what: 'Flags hostPath volumes under sensitive OS directories.',
    why: 'These paths hold credentials, kubelet state, and host binaries.',
    fix: 'Use PVC/CSI volumes; avoid mounting host OS trees.',
    exploit: 'Read/write on host paths enables escape and credential theft.',
    refs: ['volumes.hostPath']
  },
  {
    id: 'SEC-VOL-003',
    title: 'HostPath volume mounted',
    severity: 'Medium',
    source: 'volumes',
    policy: 'Baseline',
    summary: 'Pod mounts a hostPath volume.',
    what: 'Finds volumes with hostPath set (non-socket, non-critical path).',
    why: 'hostPath can expose host files or enable container escape paths.',
    fix: 'Prefer PVC, emptyDir, or CSI volumes instead of hostPath.',
    exploit: 'Write access to host paths can alter node binaries or kubelet config.',
    refs: ['volumes.hostPath']
  },
  {
    id: 'SEC-SVC-001',
    title: 'Public LoadBalancer entry point',
    severity: 'Medium',
    source: 'service',
    policy: 'Baseline',
    summary: 'Service type is LoadBalancer.',
    what: 'Lists LoadBalancer Services that expose traffic outside the cluster.',
    why: 'Public entry points expand the attack surface and need network policy + auth.',
    fix: 'Confirm exposure is intentional; add NetworkPolicies, TLS, and authn/authz.',
    exploit: 'Unprotected public ports can be scanned and attacked from the internet.',
    refs: ['Service.spec.type']
  },
  {
    id: 'SEC-SVC-002',
    title: 'NodePort service exposure',
    severity: 'Medium',
    source: 'service',
    policy: 'Baseline',
    summary: 'Service type is NodePort.',
    what: 'Lists NodePort Services reachable on node IPs.',
    why: 'NodePorts are often internet-reachable via every node.',
    fix: 'Prefer ClusterIP + Ingress; lock down node firewalls if required.',
    exploit: 'Scanners probe NodePort ranges across the fleet.',
    refs: ['Service.spec.type=NodePort']
  },
  {
    id: 'SEC-SVC-003',
    title: 'Service uses externalIPs',
    severity: 'High',
    source: 'service',
    policy: 'Baseline',
    summary: 'Service.spec.externalIPs is set.',
    what: 'Detects Services that advertise externalIPs.',
    why: 'Misconfigured externalIPs have historically enabled traffic hijacking.',
    fix: 'Avoid externalIPs; use cloud LoadBalancer or Ingress controllers.',
    exploit: 'Attackers may redirect traffic intended for other services.',
    refs: ['Service.spec.externalIPs']
  },
  {
    id: 'SEC-NET-001',
    title: 'Namespace has no NetworkPolicy',
    severity: 'Medium',
    source: 'network',
    policy: 'Baseline',
    summary: 'Workload namespace has zero NetworkPolicy objects.',
    what: 'Checks namespaces with pods for at least one NetworkPolicy.',
    why: 'Without NetworkPolicy, east-west traffic is typically wide open.',
    fix: 'Add default-deny NetworkPolicies and allow only required flows.',
    exploit: 'A single compromised pod can reach most services in the cluster.',
    refs: ['NetworkPolicy']
  },
  {
    id: 'SEC-POD-001',
    title: 'Missing CPU/memory limits',
    severity: 'Low',
    source: 'podSpec',
    policy: 'Baseline',
    summary: 'Container lacks CPU and/or memory limits.',
    what: 'Requires resources.limits.cpu and resources.limits.memory.',
    why: 'Unlimited containers can starve the node under load or attack.',
    fix: 'Set sensible limits (and requests) for every container.',
    exploit: 'Resource exhaustion becomes a denial-of-service path.',
    refs: ['resources.limits']
  },
  {
    id: 'SEC-POD-003',
    title: 'Mutable / latest image tag',
    severity: 'Low',
    source: 'podSpec',
    policy: 'Baseline',
    summary: 'Image uses :latest or has no tag/digest.',
    what: 'Flags images without an immutable tag or digest.',
    why: 'Floating tags can silently pull new, vulnerable, or malicious layers.',
    fix: 'Pin to sha256 digests or immutable version tags.',
    exploit: 'Supply-chain swaps become invisible to operators.',
    refs: ['containers.image']
  }
]

const byId = new Map(SECURITY_RULE_BOOK.map((r) => [r.id, r]))

export function securityRuleById(id: string): SecurityRuleBookEntry | undefined {
  return byId.get(id)
}

export function searchSecurityRuleBook(query: string): SecurityRuleBookEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...SECURITY_RULE_BOOK]
  return SECURITY_RULE_BOOK.filter((r) => {
    const hay = [r.id, r.title, r.summary, r.what, r.why, r.fix, r.exploit, r.source, ...r.refs]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
