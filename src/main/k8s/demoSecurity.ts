import type {
  SecurityEntryPoint,
  SecurityReport,
  SecurityVector,
  SecurityVulnerability
} from '@shared/types/security'
import { DEMO_CLUSTER_IDS } from './demoCatalog'
import { summarizeSecurityFindings } from './securityService'

const DEMO_VULNS: SecurityVulnerability[] = [
  {
    id: 'shop/storefront/SEC-SC-002',
    severity: 'High',
    workload: 'storefront',
    kind: 'Deployment',
    title: 'Allows privilege escalation',
    namespace: 'shop',
    rule: 'SEC-SC-002',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'storefront' allows privilege escalation.",
    recommendation: 'Set allowPrivilegeEscalation: false',
    exploitation: 'Attackers can use setuid/setgid binary to escalate privileges'
  },
  {
    id: 'shop/storefront/SEC-SC-005',
    severity: 'High',
    workload: 'storefront',
    kind: 'Deployment',
    title: 'Container may run as root',
    namespace: 'shop',
    rule: 'SEC-SC-005',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'storefront' may run as root.",
    recommendation: 'Set runAsNonRoot: true at pod or container level',
    exploitation: 'Root in container expands blast radius on escape'
  },
  {
    id: 'shop/checkout-api/SEC-SC-007',
    severity: 'Medium',
    workload: 'checkout-api',
    kind: 'Deployment',
    title: 'Does not drop all Linux capabilities',
    namespace: 'shop',
    rule: 'SEC-SC-007',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'checkout-api' does not drop all Linux capabilities.",
    recommendation: "Set securityContext.capabilities.drop: ['ALL']",
    exploitation: 'Default Linux capabilities expose a large attack surface'
  },
  {
    id: 'payments/payments-api/SEC-SC-004',
    severity: 'Medium',
    workload: 'payments-api',
    kind: 'Deployment',
    title: 'Writable root filesystem',
    namespace: 'payments',
    rule: 'SEC-SC-004',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'payments-api' has a writable root filesystem.",
    recommendation: 'Set readOnlyRootFilesystem: true',
    exploitation: 'Writable root lets malware persist binaries in the container'
  },
  {
    id: 'payments/payments-worker/SEC-SC-009',
    severity: 'Medium',
    workload: 'payments-worker',
    kind: 'Deployment',
    title: 'Seccomp profile is not set',
    namespace: 'payments',
    rule: 'SEC-SC-009',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'payments-worker' has no seccomp profile.",
    recommendation: 'Set seccompProfile.type: RuntimeDefault',
    exploitation: 'Missing seccomp leaves unused syscalls available'
  },
  {
    id: 'data/postgres/SEC-RBAC-008',
    severity: 'High',
    workload: 'postgres',
    kind: 'StatefulSet',
    title: 'Uses default service account',
    namespace: 'data',
    rule: 'SEC-RBAC-008',
    source: 'rbac',
    policy: 'Restricted',
    description: "Workload 'postgres' uses the default service account.",
    recommendation:
      'Create a dedicated ServiceAccount and set automountServiceAccountToken: false when unused',
    exploitation: 'Default SA often inherits broader cluster permissions'
  },
  {
    id: 'argocd/argocd-server/SEC-RBAC-011',
    severity: 'Critical',
    workload: 'argocd-server',
    kind: 'Deployment',
    title: 'Service account token is mounted',
    namespace: 'argocd',
    rule: 'SEC-RBAC-011',
    source: 'rbac',
    policy: 'Privileged',
    description: "Pod 'argocd-server' mounts a service account token with cluster-admin bindings.",
    recommendation: 'Scope the ServiceAccount Role and avoid cluster-admin',
    exploitation: 'Stolen token enables cluster-wide privilege escalation'
  },
  {
    id: 'shop/image-resizer/SEC-SC-001',
    severity: 'Critical',
    workload: 'image-resizer',
    kind: 'Deployment',
    title: 'Privileged container',
    namespace: 'shop',
    rule: 'SEC-SC-001',
    source: 'securityContext',
    policy: 'Privileged',
    description: "Container 'image-resizer' runs privileged: true.",
    recommendation: 'Remove privileged: true; use capabilities instead',
    exploitation: 'Privileged containers can escape to the host'
  },
  {
    id: 'monitoring/grafana/SEC-VOL-003',
    severity: 'Medium',
    workload: 'grafana',
    kind: 'Deployment',
    title: 'HostPath volume mounted',
    namespace: 'monitoring',
    rule: 'SEC-VOL-003',
    source: 'volumes',
    policy: 'Baseline',
    description: "Pod 'grafana' mounts a hostPath volume.",
    recommendation: 'Prefer PVC or emptyDir instead of hostPath',
    exploitation: 'hostPath can expose sensitive host files'
  },
  {
    id: 'data/redis/SEC-RBAC-014',
    severity: 'High',
    workload: 'redis',
    kind: 'StatefulSet',
    title: 'ClusterRole uses wildcard permissions',
    namespace: 'data',
    rule: 'SEC-RBAC-014',
    source: 'rbac',
    policy: 'Restricted',
    description: "ClusterRole for 'redis' grants wildcard apiGroups/resources/verbs.",
    recommendation: 'Replace wildcard verbs with least privilege',
    exploitation: 'Wildcard RBAC is a lateral-movement shortcut'
  },
  {
    id: 'kube-system/cilium-agent/SEC-SC-008',
    severity: 'Critical',
    workload: 'cilium-agent',
    kind: 'DaemonSet',
    title: 'Pod uses hostNetwork',
    namespace: 'kube-system',
    rule: 'SEC-SC-008',
    source: 'podSpec',
    policy: 'Privileged',
    description: "Pod 'cilium-agent' sets hostNetwork: true.",
    recommendation: 'Disable hostNetwork unless the workload must bind host interfaces',
    exploitation: 'hostNetwork bypasses NetworkPolicy and shares the host network stack'
  },
  {
    id: 'shop/debug-sidecar/SEC-VOL-001',
    severity: 'Critical',
    workload: 'debug-sidecar',
    kind: 'Deployment',
    title: 'Container runtime socket mounted',
    namespace: 'shop',
    rule: 'SEC-VOL-001',
    source: 'volumes',
    policy: 'Privileged',
    description: "Pod 'debug-sidecar' mounts runtime socket via hostPath '/var/run/docker.sock'.",
    recommendation: 'Never mount docker/containerd sockets into application pods',
    exploitation: 'Runtime socket access equals root on the node'
  },
  {
    id: 'payments/payments-api/SEC-SC-006',
    severity: 'Critical',
    workload: 'payments-api',
    kind: 'Deployment',
    title: 'Dangerous Linux capabilities added',
    namespace: 'payments',
    rule: 'SEC-SC-006',
    source: 'securityContext',
    policy: 'Privileged',
    description: "Container 'payments-api' adds capabilities: NET_ADMIN.",
    recommendation: 'Drop ALL capabilities and add only the minimum required set',
    exploitation: 'Capabilities like SYS_ADMIN / NET_ADMIN enable container escape and host takeover'
  },
  {
    id: 'shop/SEC-NET-001',
    severity: 'Medium',
    workload: 'shop',
    kind: 'Namespace',
    title: 'Namespace has no NetworkPolicy',
    namespace: 'shop',
    rule: 'SEC-NET-001',
    source: 'network',
    policy: 'Baseline',
    description: "Namespace 'shop' has workloads but no NetworkPolicy objects.",
    recommendation: 'Add default-deny NetworkPolicies and allow only required traffic',
    exploitation: 'Without NetworkPolicy, any pod can talk to any pod in the cluster CNI'
  },
  {
    id: 'data/rabbitmq/SEC-SVC-002',
    severity: 'Medium',
    workload: 'rabbitmq',
    kind: 'Service',
    title: 'NodePort service exposure',
    namespace: 'data',
    rule: 'SEC-SVC-002',
    source: 'service',
    policy: 'Baseline',
    description: "Service 'rabbitmq' is type NodePort.",
    recommendation: 'Prefer ClusterIP + Ingress; lock down node firewalls if NodePort is required',
    exploitation: 'NodePorts are reachable on every node IP and often scanned'
  },
  {
    id: 'shop/storefront/SEC-POD-003',
    severity: 'Low',
    workload: 'storefront',
    kind: 'Deployment',
    title: 'Mutable / latest image tag',
    namespace: 'shop',
    rule: 'SEC-POD-003',
    source: 'podSpec',
    policy: 'Baseline',
    description: "Container 'storefront' uses image 'shop/storefront:latest' without a digest.",
    recommendation: 'Pin images to a digest (sha256:…) or an immutable version tag',
    exploitation: 'Floating tags can silently introduce vulnerable or malicious layers'
  },
  {
    id: 'shop/admin-console/SEC-SVC-001',
    severity: 'Medium',
    workload: 'admin-console',
    kind: 'Service',
    title: 'Public LoadBalancer entry point',
    namespace: 'shop',
    rule: 'SEC-SVC-001',
    source: 'service',
    policy: 'Baseline',
    description: "Service 'admin-console' is type LoadBalancer.",
    recommendation: 'Restrict with NetworkPolicy / cloud firewall; prefer Ingress where possible',
    exploitation: 'Internet-facing Service expands the attack surface'
  },
  {
    id: 'ingress-nginx/ingress-nginx-controller/SEC-SVC-001',
    severity: 'Medium',
    workload: 'ingress-nginx-controller',
    kind: 'Service',
    title: 'Public LoadBalancer entry point',
    namespace: 'ingress-nginx',
    rule: 'SEC-SVC-001',
    source: 'service',
    policy: 'Baseline',
    description: "Service 'ingress-nginx-controller' is type LoadBalancer.",
    recommendation: 'Restrict with NetworkPolicy / cloud firewall; prefer Ingress where possible',
    exploitation: 'Internet-facing Service expands the attack surface'
  }
]

const DEMO_ENTRY_POINTS: SecurityEntryPoint[] = [
  {
    name: 'storefront',
    namespace: 'shop',
    type: 'LoadBalancer',
    ports: '80:http/TCP',
    age: new Date(Date.now() - 18 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.12.4',
    externalIPs: '34.90.12.8'
  },
  {
    name: 'argocd-server',
    namespace: 'argocd',
    type: 'LoadBalancer',
    ports: '443:https/TCP, 80:http/TCP',
    age: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.20.1',
    externalIPs: '34.90.12.8'
  },
  {
    name: 'grafana',
    namespace: 'monitoring',
    type: 'LoadBalancer',
    ports: '3000:http/TCP',
    age: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.30.9',
    externalIPs: '34.90.12.8'
  },
  {
    name: 'ingress-nginx-controller',
    namespace: 'ingress-nginx',
    type: 'LoadBalancer',
    ports: '80:http/TCP, 443:https/TCP',
    age: new Date(Date.now() - 41 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.40.2',
    externalIPs: '34.90.12.8'
  },
  {
    name: 'rabbitmq',
    namespace: 'data',
    type: 'NodePort',
    ports: '5672:amqp/TCP, 15672:mgmt/TCP',
    age: new Date(Date.now() - 48 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.50.3'
  },
  {
    name: 'redis',
    namespace: 'data',
    type: 'NodePort',
    ports: '6379:tcp-redis/TCP',
    age: new Date(Date.now() - 41 * 86_400_000).toISOString(),
    status: 'Pending',
    clusterIP: '10.96.50.4'
  },
  {
    name: 'prometheus',
    namespace: 'monitoring',
    type: 'NodePort',
    ports: '9090:http/TCP',
    age: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    status: 'Active',
    clusterIP: '10.96.30.10'
  }
]

const DEMO_VECTORS: SecurityVector[] = [
  {
    id: 'shop/storefront->shop/checkout-api',
    from: 'storefront',
    fromDetail: 'storefront',
    to: 'checkout-api',
    toDetail: 'checkout-api',
    namespace: 'shop'
  },
  {
    id: 'shop/storefront->shop/catalog-api',
    from: 'storefront',
    fromDetail: 'storefront',
    to: 'catalog-api',
    toDetail: 'catalog-api',
    namespace: 'shop'
  },
  {
    id: 'shop/checkout-api->payments/payments-api',
    from: 'checkout-api',
    fromDetail: 'checkout-api',
    to: 'payments-api',
    toDetail: 'payments-api',
    namespace: 'shop'
  },
  {
    id: 'payments/payments-api->data/postgres',
    from: 'payments-api',
    fromDetail: 'payments-api',
    to: 'postgres',
    toDetail: 'postgres-0',
    namespace: 'payments'
  },
  {
    id: 'payments/payments-api->data/redis',
    from: 'payments-api',
    fromDetail: 'payments-api',
    to: 'redis',
    toDetail: 'redis-0',
    namespace: 'payments'
  },
  {
    id: 'payments/payments-worker->data/rabbitmq',
    from: 'payments-worker',
    fromDetail: 'payments-worker',
    to: 'rabbitmq',
    toDetail: 'rabbitmq-0',
    namespace: 'payments'
  },
  {
    id: 'payments/fraud-engine->payments/payments-api',
    from: 'fraud-engine',
    fromDetail: 'fraud-engine',
    to: 'payments-api',
    toDetail: 'payments-api',
    namespace: 'payments'
  },
  {
    id: 'argocd/argocd-server->argocd/argocd-redis',
    from: 'argocd-server',
    fromDetail: 'argocd-server',
    to: 'argocd-redis',
    toDetail: 'argocd-redis',
    namespace: 'argocd'
  },
  {
    id: 'monitoring/grafana->monitoring/prometheus',
    from: 'grafana',
    fromDetail: 'grafana',
    to: 'prometheus',
    toDetail: 'prometheus',
    namespace: 'monitoring'
  },
  {
    id: 'shop/catalog-api->shop/search-index',
    from: 'catalog-api',
    fromDetail: 'catalog-api',
    to: 'search-index',
    toDetail: 'search-index',
    namespace: 'shop'
  }
]

export function demoSecurityReport(clusterId: string = DEMO_CLUSTER_IDS.prod): SecurityReport {
  const summary = summarizeSecurityFindings(DEMO_VULNS)
  return {
    clusterId,
    scannedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    ...summary,
    vulnerabilities: DEMO_VULNS,
    entryPoints: DEMO_ENTRY_POINTS,
    vectors: DEMO_VECTORS
  }
}
